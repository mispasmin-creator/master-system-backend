const { prisma } = require('../../config/db');

const QTY_EPSILON = 0.01;

// @desc    Order receipts awaiting Logistics Approval
// @route   GET /api/order/logistics-approval/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { logisticsStatus: 'Pending Approval' },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Order receipts already approved
// @route   GET /api/order/logistics-approval/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { logisticsStatus: 'Approved' },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const parseIds = (raw) =>
  String(raw || '')
    .split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => !Number.isNaN(v));

// @desc    Load the latest Pending-Approval logistics plan + ordered splits
//          for a PO group (the group's row ids, resolved client-side).
// @route   GET /api/order/logistics-approval/splits?receiptIds=1,2,3
// @access  Public
const getSplitsForGroup = async (req, res, next) => {
  try {
    const receiptIds = parseIds(req.query.receiptIds);
    if (receiptIds.length === 0) {
      res.status(400);
      throw new Error('receiptIds query param is required.');
    }

    const allSplits = await prisma.orderLogisticsSplit.findMany({
      where: { receiptId: { in: receiptIds } },
      include: { plan: true },
      orderBy: { planId: 'desc' },
    });

    const pendingPlan = allSplits.find((s) => s.plan?.status === 'Pending Approval')?.plan || null;
    const splits = pendingPlan
      ? allSplits.filter((s) => s.planId === pendingPlan.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [];

    res.json({ success: true, data: { plan: pendingPlan, splits } });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve some/all splits of the pending plan for a PO group,
//          allocating quantity per split. A product row flips to 'Approved'
//          once its cumulative approved qty reaches its ordered quantity;
//          otherwise it stays 'Pending Approval' for a later partial round.
// @route   POST /api/order/logistics-approval/approve
// @access  Private
const approve = async (req, res, next) => {
  try {
    const { receiptIds, allocations, approvedBy, remarks } = req.body;
    const ids = (receiptIds || []).map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v));
    if (ids.length === 0) {
      res.status(400);
      throw new Error('receiptIds is required.');
    }
    if (!Array.isArray(allocations) || allocations.length === 0) {
      res.status(400);
      throw new Error('At least one allocation is required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      let planId = null;

      for (const alloc of allocations) {
        const splitId = parseInt(alloc.splitId, 10);
        const qty = parseFloat(alloc.allocatedQty);
        if (Number.isNaN(splitId) || Number.isNaN(qty) || qty <= 0) continue;

        const split = await tx.orderLogisticsSplit.findUnique({ where: { id: splitId } });
        if (!split || !['Checked', 'Pending Approval', 'Pending'].includes(split.status)) continue;

        planId = split.planId;
        const updated = await tx.orderLogisticsSplit.update({
          where: { id: splitId },
          data: { allocatedQty: qty, status: 'Checked' },
        });

        await tx.orderLogisticsApproval.create({
          data: {
            splitId,
            receiptId: split.receiptId,
            action: 'Approve',
            approvedQty: qty,
            approvedBy: approvedBy || null,
            remarks: remarks || null,
          },
        });
        void updated;
      }

      // Group-level plan status: flips to Approved once its cumulative
      // Checked/Dispatched/Logistic-Completed allocation matches the whole
      // group's total ordered quantity.
      if (planId) {
        const [planSplits, groupReceipts] = await Promise.all([
          tx.orderLogisticsSplit.findMany({ where: { planId } }),
          tx.orderReceipt.findMany({ where: { id: { in: ids } } }),
        ]);
        const totalOrderQty = groupReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const totalApprovedForPlan = planSplits
          .filter((s) => ['Checked', 'Dispatched', 'Logistic Completed'].includes(s.status))
          .reduce((sum, s) => sum + (s.allocatedQty || 0), 0);
        if (Math.abs(totalApprovedForPlan - totalOrderQty) <= QTY_EPSILON) {
          await tx.orderLogisticsPlan.update({ where: { id: planId }, data: { status: 'Approved' } });
        }
      }

      // Per-product-row status: flips to Approved once ITS OWN cumulative
      // approved qty reaches its ordered quantity.
      const updatedReceipts = [];
      for (const receiptId of ids) {
        const [receipt, ownSplits] = await Promise.all([
          tx.orderReceipt.findUnique({ where: { id: receiptId } }),
          tx.orderLogisticsSplit.findMany({ where: { receiptId } }),
        ]);
        if (!receipt) continue;
        const totalApproved = ownSplits
          .filter((s) => ['Checked', 'Dispatched', 'Logistic Completed'].includes(s.status))
          .reduce((sum, s) => sum + (s.allocatedQty || 0), 0);
        const row = await tx.orderReceipt.update({
          where: { id: receiptId },
          data: {
            logisticsStatus: Math.abs(totalApproved - (receipt.quantity || 0)) <= QTY_EPSILON ? 'Approved' : 'Pending Approval',
            approvedLogisticsPlanId: planId,
            logisticsApprovedQty: totalApproved,
          },
        });
        updatedReceipts.push(row);
      }

      return updatedReceipts;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject the pending plan for a PO group. mode='replan' sends
//          undispatched splits back to Arrange Logistics (Pending
//          Arrangement); mode='full' is a terminal rejection (Logistics
//          Rejected) on the still-undispatched portion.
// @route   POST /api/order/logistics-approval/reject
// @access  Private
const reject = async (req, res, next) => {
  try {
    const { receiptIds, mode, approvedBy, remarks } = req.body;
    const ids = (receiptIds || []).map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v));
    if (ids.length === 0) {
      res.status(400);
      throw new Error('receiptIds is required.');
    }
    if (!['replan', 'full'].includes(mode)) {
      res.status(400);
      throw new Error('mode must be "replan" or "full".');
    }

    const result = await prisma.$transaction(async (tx) => {
      const splits = await tx.orderLogisticsSplit.findMany({ where: { receiptId: { in: ids } } });
      const planIds = [...new Set(splits.map((s) => s.planId).filter(Boolean))];

      if (planIds.length > 0) {
        await tx.orderLogisticsPlan.updateMany({ where: { id: { in: planIds } }, data: { status: 'Rejected' } });
        await tx.orderLogisticsSplit.updateMany({
          where: { planId: { in: planIds }, status: { not: 'Dispatched' } },
          data: { status: 'Rejected' },
        });
      }

      for (const receiptId of ids) {
        await tx.orderLogisticsApproval.create({
          data: {
            receiptId,
            action: mode === 'full' ? 'Fully Reject' : 'Reject & Plan Again',
            approvedBy: approvedBy || null,
            remarks: remarks || null,
          },
        });

        const ownSplits = await tx.orderLogisticsSplit.findMany({ where: { receiptId } });
        const dispatchedQty = ownSplits
          .filter((s) => ['Dispatched', 'Logistic Completed'].includes(s.status))
          .reduce((sum, s) => sum + (s.allocatedQty || 0), 0);

        await tx.orderReceipt.update({
          where: { id: receiptId },
          data: {
            logisticsStatus: mode === 'full' ? 'Logistics Rejected' : 'Pending Arrangement',
            approvedLogisticsPlanId: null,
            logisticsApprovedQty: dispatchedQty,
          },
        });
      }

      return { receiptIds: ids, mode };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, getSplitsForGroup, approve, reject };
