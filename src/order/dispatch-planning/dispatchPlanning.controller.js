const { prisma } = require('../../config/db');
const { nextSequenceNumbers } = require('../shared/sequence');

const QTY_EPSILON = 0.01;

// Ex-Factory orders skip Arrange Logistics + Logistics Approval entirely:
// on every fetch, auto-create an already-Approved plan+split for any
// eligible receipt that doesn't have one yet. Mirrors the reference app's
// "runs on every fetch" auto-bypass in DispatchPlanningPage.jsx.
async function ensureExFactoryBypass() {
  const candidates = await prisma.orderReceipt.findMany({
    where: {
      typeOfTransporting: 'Ex Factory',
      receivedAccounts: { isNot: null },
      checkDelivery: { isNot: null },
      OR: [{ logisticsStatus: null }, { logisticsStatus: 'Pending Arrangement' }],
    },
  });

  for (const receipt of candidates) {
    const existing = await prisma.orderLogisticsSplit.findFirst({
      where: { receiptId: receipt.id, status: { in: ['Checked', 'Dispatched', 'Logistic Completed'] } },
    });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const remainingQty = Math.max(0, (receipt.quantity || 0) - (receipt.logisticsApprovedQty || 0));
      const plan = await tx.orderLogisticsPlan.create({
        data: { receiptId: receipt.id, mode: 'single', status: 'Approved', createdBy: 'Ex Factory Auto' },
      });
      await tx.orderLogisticsSplit.create({
        data: {
          planId: plan.id,
          receiptId: receipt.id,
          transporterName: 'Ex Factory',
          allocatedQty: remainingQty,
          status: 'Checked',
        },
      });
      await tx.orderReceipt.update({
        where: { id: receipt.id },
        data: { logisticsStatus: 'Approved', approvedLogisticsPlanId: plan.id, logisticsApprovedQty: receipt.quantity || 0 },
      });
    });
  }
}

// Builds the dispatchable-line list: real "Checked" splits with no
// dispatch_record_id yet, plus a synthetic (not persisted) line for any
// Approved/already-dispatched-once receipt with pendingQty > 0 but no such
// split — lazily materialized into real rows at actual dispatch time.
async function buildDispatchableLines() {
  await ensureExFactoryBypass();

  const [checkedSplits, approvedReceipts] = await Promise.all([
    prisma.orderLogisticsSplit.findMany({
      where: { status: 'Checked', dispatchRecordId: null },
      include: { receipt: true },
    }),
    prisma.orderReceipt.findMany({
      where: { logisticsStatus: 'Approved', pendingQty: { gt: 0 } },
    }),
  ]);

  const lines = checkedSplits
    .filter((s) => s.receipt)
    .map((s) => ({
      splitId: s.id,
      receiptId: s.receiptId,
      receipt: s.receipt,
      transporterName: s.transporterName,
      allocatedQty: s.allocatedQty || 0,
      dispatchableQty: Math.min(s.allocatedQty || 0, s.receipt.pendingQty || 0),
      synthetic: false,
    }));

  const coveredReceiptIds = new Set(lines.map((l) => l.receiptId));
  for (const receipt of approvedReceipts) {
    if (coveredReceiptIds.has(receipt.id)) continue;
    lines.push({
      splitId: `synthetic_${receipt.id}`,
      receiptId: receipt.id,
      receipt,
      transporterName: null,
      allocatedQty: receipt.pendingQty || 0,
      dispatchableQty: receipt.pendingQty || 0,
      synthetic: true,
    });
  }

  return lines;
}

// @desc    Dispatchable lines (Pending Dispatch tab)
// @route   GET /api/order/dispatch-planning/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const lines = await buildDispatchableLines();
    res.json({ success: true, data: lines });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch history
// @route   GET /api/order/dispatch-planning/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      orderBy: { id: 'desc' },
      include: { receipt: true },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a dispatch batch — one or more lines, each capped to
//          min(allocatedQty, pendingQty). Recomputes Delivered/Pending Qty
//          on each affected receipt (sequentially per receipt to avoid
//          races) and creates the DISPATCH rows.
// @route   POST /api/order/dispatch-planning/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const { lines, typeOfTransporting, dateOfDispatch, tcRequired } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      res.status(400);
      throw new Error('At least one line is required.');
    }
    if (!dateOfDispatch) {
      res.status(400);
      throw new Error('Date Of Dispatch is required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: recompute Delivered/Pending Qty per unique receipt, sequentially.
      const byReceipt = lines.reduce((acc, l) => {
        (acc[l.receiptId] = acc[l.receiptId] || []).push(l);
        return acc;
      }, {});

      for (const [receiptIdRaw, group] of Object.entries(byReceipt)) {
        const receiptId = parseInt(receiptIdRaw, 10);
        const receipt = await tx.orderReceipt.findUnique({ where: { id: receiptId } });
        if (!receipt) continue;

        const requestedSum = group.reduce((sum, l) => sum + (parseFloat(l.dispatchQty) || 0), 0);
        if (requestedSum > (receipt.pendingQty || 0) + QTY_EPSILON) {
          const err = new Error(`Dispatch quantity exceeds pending quantity for receipt #${receiptId}.`);
          err.statusCode = 400;
          throw err;
        }

        const newDelivered = (receipt.delivered || 0) + requestedSum;
        const newPending = Math.max(0, (receipt.quantity || 0) - newDelivered);
        await tx.orderReceipt.update({
          where: { id: receiptId },
          data: { delivered: newDelivered, pendingQty: newPending },
        });
      }

      // Step 2: allocate D-Sr numbers for the whole batch up front.
      const dSrNumbers = await nextSequenceNumbers(tx, {
        lockKey: 'order_dispatch_dsr_number',
        tableName: 'order_dispatch',
        column: 'D-Sr Number',
        regex: /D-(\d+)/i,
        prefix: 'D-',
        pad: 2,
        count: lines.length,
      });

      const created = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const receiptId = parseInt(line.receiptId, 10);
        const receipt = await tx.orderReceipt.findUnique({ where: { id: receiptId } });
        if (!receipt) continue;

        let splitId = line.splitId;
        let logisticsPlanId = null;

        if (typeof splitId === 'string' && splitId.startsWith('synthetic_')) {
          let plan = await tx.orderLogisticsPlan.findFirst({
            where: { receiptId, status: 'Approved' },
            orderBy: { id: 'desc' },
          });
          if (!plan) {
            plan = await tx.orderLogisticsPlan.create({
              data: { receiptId, mode: 'single', status: 'Approved', createdBy: 'Auto Generated' },
            });
            await tx.orderReceipt.update({
              where: { id: receiptId },
              data: { logisticsStatus: 'Approved', approvedLogisticsPlanId: plan.id },
            });
          }
          const dispatchableQty = Math.min(parseFloat(line.dispatchQty) || 0, receipt.pendingQty || 0);
          const newSplit = await tx.orderLogisticsSplit.create({
            data: { planId: plan.id, receiptId, status: 'Checked', allocatedQty: dispatchableQty },
          });
          splitId = newSplit.id;
          logisticsPlanId = plan.id;
        } else {
          splitId = parseInt(splitId, 10);
          const split = await tx.orderLogisticsSplit.findUnique({ where: { id: splitId } });
          logisticsPlanId = split?.planId ?? null;
        }

        const dispatchQty = parseFloat(line.dispatchQty) || 0;

        const dispatchRow = await tx.orderDispatch.create({
          data: {
            timestamp: new Date(),
            dSrNumber: dSrNumbers[i],
            doNumber: receipt.doNumber,
            partyName: receipt.partyName,
            productName: receipt.productName,
            qtyToBeDispatched: dispatchQty,
            typeOfTransporting: typeOfTransporting || receipt.typeOfTransporting,
            dateOfDispatch: new Date(dateOfDispatch),
            tcRequired: tcRequired || receipt.tcRequired,
            receiptId,
            logisticsPlanId,
            logisticsSplitId: splitId,
          },
        });

        const split = await tx.orderLogisticsSplit.findUnique({ where: { id: splitId } });
        const allocated = split?.allocatedQty || 0;
        await tx.orderLogisticsSplit.update({
          where: { id: splitId },
          data: { status: 'Dispatched', dispatchRecordId: dispatchRow.id, allocatedQty: dispatchQty },
        });

        // Partial dispatch: re-open the remainder as a fresh Checked split.
        const remainingQty = allocated - dispatchQty;
        if (remainingQty > 0.001) {
          await tx.orderLogisticsSplit.create({
            data: {
              planId: logisticsPlanId,
              receiptId,
              transporterName: split?.transporterName || null,
              rate: split?.rate || null,
              vehicleDetails: split?.vehicleDetails || null,
              allocatedQty: remainingQty,
              status: 'Checked',
            },
          });
        }

        created.push(dispatchRow);
      }

      return created;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Cancel an order (whole PO group) — terminal, non-reversible.
// @route   POST /api/order/dispatch-planning/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const { receiptIds, cancelledBy } = req.body;
    const ids = (receiptIds || []).map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v));
    if (ids.length === 0) {
      res.status(400);
      throw new Error('receiptIds is required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.orderReceipt.updateMany({
        where: { id: { in: ids } },
        data: { logisticsStatus: 'Order Cancelled', orderCancelledAt: new Date(), orderCancelledBy: cancelledBy || null },
      });
      const plans = await tx.orderLogisticsPlan.findMany({ where: { receiptId: { in: ids } } });
      const planIds = plans.map((p) => p.id);
      if (planIds.length > 0) {
        await tx.orderLogisticsPlan.updateMany({ where: { id: { in: planIds } }, data: { status: 'Rejected' } });
      }
      await tx.orderLogisticsSplit.updateMany({ where: { receiptId: { in: ids } }, data: { status: 'Rejected' } });
      return { receiptIds: ids };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, submit, cancelOrder };
