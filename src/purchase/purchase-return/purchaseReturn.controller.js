const { prisma } = require('../../config/db');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const mismatchInclude = { lift: { include: { receipt: true, indent: { include: { generatePo: true } } } } };

const poNumberOf = (m) => m?.lift?.indent?.generatePo?.poNumber || (m?.lift?.indentId != null ? String(m.lift.indentId) : '');

// @desc    List pending mismatches awaiting return + finalized Purchase Returns
// @route   GET /api/purchase/purchase-return/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const returns = await prisma.purchasePurchaseReturn.findMany({ orderBy: { timeStamp: 'desc' } });

    const history = returns.map((r) => ({
      id: r.id,
      'Purchase Return No.': r.purchaseReturnNo || '',
      'Po No.': r.poNo || '',
      'Action Type': r.actionType || '',
      'Party Name': r.partyName || '',
      'Product Name': r.productName || '',
      'Product Rate': r.productRate != null ? String(r.productRate) : '',
      Qty: r.qty != null ? String(r.qty) : '',
      'Total Qty': r.totalQty != null ? String(r.totalQty) : '',
      'Total Return Qty': r.totalReturnQty != null ? String(r.totalReturnQty) : '',
      'Return This Time': r.returnThisTime != null ? String(r.returnThisTime) : '',
      'Return Reason': r.returnReason || '',
      Transport: r.transport || '',
      'Type of Transport': r.typeOfTransport || '',
      'Vehicle No': r.vehicleNo || '',
      'Builty No': r.builtyNo || '',
      'Rate Type': r.rateType || '',
      Amount: r.amount != null ? String(r.amount) : '',
      'Bill No': r.billNo || '',
      'Org. Bill No': r.orgBillNo || '',
      'Bill Image': r.billImage || '',
      'Lift No': r.liftNo || '',
      'Firm Name': r.firmName || '',
      'Credit Note URL': r.creditNoteUrl || '',
      'Time Stamp': r.timeStamp ? r.timeStamp.toISOString() : '',
      mismatch_id: r.mismatchId != null ? String(r.mismatchId) : null,
    }));

    const directMismatches = await prisma.purchaseMismatch.findMany({
      where: { status: 'Purchase Return', coordinationStatus: 'COORDINATED' },
      include: mismatchInclude,
    });
    const directIds = new Set(directMismatches.map((m) => m.id));

    const fallbackCoords = await prisma.purchasePurchaserCoordinate.findMany({
      where: { status: 'COORDINATED', type: 'Return Material and Make Debit Note' },
    });
    const fallbackIds = fallbackCoords
      .map((c) => c.mismatchId)
      .filter((id) => id != null && !directIds.has(id));

    const fallbackMismatches = fallbackIds.length
      ? await prisma.purchaseMismatch.findMany({ where: { id: { in: fallbackIds } }, include: mismatchInclude })
      : [];

    const seen = new Set();
    const allMismatches = [...directMismatches, ...fallbackMismatches].filter((m) =>
      seen.has(m.id) ? false : (seen.add(m.id), true),
    );

    // Returned-qty aggregation, keyed by both mismatchId and Lift No (covers
    // manual returns that never got linked to a mismatch_id).
    const returnedByMismatch = {};
    const totalReturnByMismatch = {};
    const returnedByLift = {};
    const totalReturnByLift = {};
    for (const r of returns) {
      const returnedThisTime = (r.returnThisTime != null ? r.returnThisTime : r.qty) || 0;
      const configuredTotal = r.totalReturnQty || 0;
      if (r.mismatchId != null) {
        returnedByMismatch[r.mismatchId] = (returnedByMismatch[r.mismatchId] || 0) + returnedThisTime;
        if (configuredTotal > 0) {
          totalReturnByMismatch[r.mismatchId] = Math.max(totalReturnByMismatch[r.mismatchId] || 0, configuredTotal);
        }
      }
      const liftKey = (r.liftNo || '').trim();
      if (liftKey) {
        returnedByLift[liftKey] = (returnedByLift[liftKey] || 0) + returnedThisTime;
        if (configuredTotal > 0) {
          totalReturnByLift[liftKey] = Math.max(totalReturnByLift[liftKey] || 0, configuredTotal);
        }
      }
    }

    let pendingList = allMismatches
      .map((m) => {
        const liftNo = m.lift?.liftNo || '';
        const receivedQty = m.lift?.receipt?.actualQuantity;
        const totalQty = receivedQty != null && receivedQty > 0 ? receivedQty : m.qty || 0;
        const returnedQty = Math.max(returnedByMismatch[m.id] || 0, returnedByLift[liftNo] || 0);
        const configuredTotalReturnQty = totalReturnByMismatch[m.id] || totalReturnByLift[liftNo] || 0;
        const returnTargetQty = configuredTotalReturnQty > 0 ? configuredTotalReturnQty : totalQty;
        const pendingQty = Math.max(0, returnTargetQty - returnedQty);
        const isStillPending = pendingQty > 0.001 || (returnedQty === 0 && returnTargetQty > 0);

        return {
          id: m.id,
          'Lift Number': liftNo,
          'Lift ID': liftNo,
          'Indent Number': poNumberOf(m),
          'Action Type': m.actionType || '',
          'Party Name': m.partyName || '',
          'Product Name': m.productName || '',
          Remarks: m.remarks || '',
          'Firm Name': m.firmName || '',
          pendingQty,
          totalQty,
          returnedQty,
          totalReturnQty: configuredTotalReturnQty,
          returnTargetQty,
          isStillPending,
        };
      })
      .filter((m) => m.isStillPending);

    const byLift = new Map();
    const noLift = [];
    for (const m of pendingList) {
      const key = (m['Lift Number'] || '').trim();
      if (!key) {
        noLift.push(m);
        continue;
      }
      const existing = byLift.get(key);
      if (!existing || m.pendingQty > existing.pendingQty) byLift.set(key, m);
    }
    const pending = [...byLift.values(), ...noLift];

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Look up a lift for auto-filling the return form (by Lift No)
// @route   GET /api/purchase/purchase-return/lift/:liftNo
// @access  Public
const lookupLift = async (req, res, next) => {
  try {
    const liftNo = req.params.liftNo;
    const excludeReturnId = req.query.excludeReturnId ? Number(req.query.excludeReturnId) : null;

    const lift = await prisma.purchaseLift.findFirst({
      where: { liftNo },
      include: { receipt: true, indent: { include: { generatePo: true } } },
    });

    if (!lift) {
      res.status(404);
      throw new Error(`Lift No. ${liftNo} was not found.`);
    }

    const previousReturns = await prisma.purchasePurchaseReturn.findMany({
      where: { liftNo },
      select: { id: true, qty: true, returnThisTime: true },
    });

    const previouslyReturnedQty = previousReturns
      .filter((r) => (excludeReturnId != null ? r.id !== excludeReturnId : true))
      .reduce((sum, r) => sum + ((r.returnThisTime != null ? r.returnThisTime : r.qty) || 0), 0);

    const actualQuantity = lift.receipt?.actualQuantity || 0;

    res.json({
      success: true,
      data: {
        liftNo: lift.liftNo || '',
        poNo: lift.indent?.generatePo?.poNumber || (lift.indentId != null ? String(lift.indentId) : ''),
        partyName: lift.vendorName || '',
        productName: lift.rawMaterialName || '',
        billNo: lift.billNo || '',
        billImage: lift.billImage || '',
        productRate: lift.rate != null ? String(lift.rate) : '',
        firmName: lift.firmName || '',
        actualQuantity,
        maxReturnQty: Math.max(0, actualQuantity - previouslyReturnedQty),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all lifts (for the "manual return" Lift No. picker)
// @route   GET /api/purchase/purchase-return/lifts
// @access  Public
const listLifts = async (req, res, next) => {
  try {
    const lifts = await prisma.purchaseLift.findMany({
      orderBy: { timestamp: 'desc' },
      select: { liftNo: true, vendorName: true, firmName: true },
    });
    const data = lifts.map((l) => ({
      'Lift No': l.liftNo || '',
      'Vendor Name': l.vendorName || '',
      'Firm Name': l.firmName || '',
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Look up a lift by PO/Indent number, for auto-filling bill details
// @route   GET /api/purchase/purchase-return/po/:poNo
// @access  Public
const lookupPo = async (req, res, next) => {
  try {
    const poNo = req.params.poNo;
    const indentIdNum = Number(poNo);

    const lift = await prisma.purchaseLift.findFirst({
      where: Number.isFinite(indentIdNum)
        ? { indentId: indentIdNum }
        : { indent: { generatePo: { poNumber: poNo } } },
      orderBy: { timestamp: 'desc' },
    });

    if (!lift) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({
      success: true,
      data: {
        billNo: lift.billNo || '',
        billImage: lift.billImage || '',
        partyName: lift.vendorName || '',
        productName: lift.rawMaterialName || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Next auto-generated Purchase Return number (PR-001, PR-002, ...)
// @route   GET /api/purchase/purchase-return/next-number
// @access  Public
const nextNumber = async (req, res, next) => {
  try {
    const count = await prisma.purchasePurchaseReturn.count();
    res.json({ success: true, data: { purchaseReturnNo: `PR-${String(count + 1).padStart(3, '0')}` } });
  } catch (error) {
    next(error);
  }
};

// Mirrors PurchaseReturnPage.jsx's updateMismatchStatus: recompute total
// returned vs. target across all returns for this mismatch, and flip the
// Mismatch's Status/Action Type depending on whether it's now fully returned.
const cascadeMismatchStatus = async (mismatchId, actionType) => {
  const mismatch = await prisma.purchaseMismatch.findUnique({
    where: { id: mismatchId },
    include: mismatchInclude,
  });
  if (!mismatch) return;

  const allReturns = await prisma.purchasePurchaseReturn.findMany({
    where: { mismatchId },
    select: { qty: true, totalReturnQty: true, returnThisTime: true },
  });

  const receivedQty = mismatch.lift?.receipt?.actualQuantity;
  const totalQty = receivedQty != null && receivedQty > 0 ? receivedQty : mismatch.qty || 0;

  const totalReturned = allReturns.reduce((sum, r) => sum + ((r.returnThisTime != null ? r.returnThisTime : r.qty) || 0), 0);
  const configuredTotalReturnQty = allReturns.reduce((max, r) => Math.max(max, r.totalReturnQty || 0), 0);
  const returnTargetQty = configuredTotalReturnQty || totalQty;

  if (totalReturned >= returnTargetQty) {
    const shouldMakeDebitAfterReturn = actionType === 'Return Material and Make Debit Note';
    await prisma.purchaseMismatch.update({
      where: { id: mismatchId },
      data: shouldMakeDebitAfterReturn
        ? { status: 'Credit Notes', coordinationStatus: 'COORDINATED', actionType: 'Make Debit Note' }
        : { status: 'Resolved - Return', actionType },
    });
  } else {
    await prisma.purchaseMismatch.update({
      where: { id: mismatchId },
      data: { status: 'Purchase Return', coordinationStatus: 'COORDINATED', actionType },
    });
  }
};

// @desc    Create (or update, if `id` present) a Purchase Return record
// @route   POST /api/purchase/purchase-return/submit
// @route   POST /api/purchase/purchase-return/update/:returnId
// @access  Private
const saveReturn = async (req, res, next) => {
  try {
    const returnId = req.params.returnId ? Number(req.params.returnId) : null;
    if (req.params.returnId && !Number.isFinite(returnId)) {
      res.status(400);
      throw new Error('Invalid returnId');
    }

    const {
      purchaseReturnNo,
      poNo,
      actionType,
      partyName,
      productName,
      qty,
      totalReturnQty,
      returnThisTime,
      returnReason,
      transport,
      typeOfTransport,
      vehicleNo,
      builtyNo,
      rateType,
      amount,
      productRate,
      orgBillNo,
      billNo,
      billImage,
      liftNo,
      firmName,
      totalQty,
      creditNoteUrl,
      mismatchId: mismatchIdInput,
    } = req.body;

    if (!purchaseReturnNo || !liftNo || !poNo || !totalReturnQty || !returnThisTime) {
      res.status(400);
      throw new Error('Please provide PR No., Lift No., PO / Indent No, Total Return Qty and Return This Time.');
    }

    const mismatchIdProvided = mismatchIdInput != null && mismatchIdInput !== '';
    let mismatchId = mismatchIdProvided ? Number(mismatchIdInput) : null;

    // On edit, fall back to whatever mismatch was already linked so a
    // SuperAdmin field edit (which doesn't send mismatchId) doesn't sever it.
    if (returnId && !mismatchIdProvided) {
      const existing = await prisma.purchasePurchaseReturn.findUnique({ where: { id: returnId }, select: { mismatchId: true } });
      mismatchId = existing?.mismatchId ?? null;
    }

    const actionTypeToUse = actionType || 'Return Material and Make Debit Note';

    if (!returnId && !mismatchId) {
      const created = await prisma.purchaseMismatch.create({
        data: {
          timestamp: new Date(),
          liftId: null,
          firmName: firmName || null,
          partyName: partyName || null,
          productName: productName || null,
          qty: num(totalQty),
          status: 'Purchase Return',
          coordinationStatus: 'COORDINATED',
          actionType: 'Return Material and Make Debit Note',
          remarks: returnReason || 'Manual Purchase Return',
        },
      });
      mismatchId = created.id;
    }

    const payload = {
      timeStamp: new Date(),
      purchaseReturnNo,
      poNo: poNo || '',
      actionType: actionTypeToUse,
      partyName: partyName || null,
      productName: productName || null,
      qty: Math.round(num(returnThisTime)),
      totalReturnQty: num(totalReturnQty),
      returnThisTime: num(returnThisTime),
      returnReason: returnReason || null,
      transport: transport || null,
      typeOfTransport: typeOfTransport || null,
      vehicleNo: vehicleNo || null,
      builtyNo: builtyNo || null,
      rateType: rateType || null,
      amount: num(amount),
      productRate: productRate ? num(productRate) : null,
      billNo: billNo || null,
      orgBillNo: orgBillNo || null,
      liftNo: liftNo || null,
      firmName: firmName || null,
      mismatchId: mismatchId || null,
      totalQty: num(totalQty),
      creditNoteUrl: creditNoteUrl || null,
      billImage: billImage || null,
    };

    if (returnId) {
      await prisma.purchasePurchaseReturn.update({ where: { id: returnId }, data: payload });
    } else {
      await prisma.purchasePurchaseReturn.create({ data: payload });
    }

    if (mismatchId) {
      await cascadeMismatchStatus(mismatchId, actionTypeToUse);
    }

    res.status(returnId ? 200 : 201).json({ success: true, data: { mismatchId } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, lookupLift, lookupPo, listLifts, nextNumber, saveReturn };
