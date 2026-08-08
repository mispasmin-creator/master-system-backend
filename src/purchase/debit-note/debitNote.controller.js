const { prisma } = require('../../config/db');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const mismatchInclude = { lift: true, debitNotes: true, purchaseReturns: true };

// @desc    List mismatches/manual-returns pending a debit note + finalized ones
// @route   GET /api/purchase/debit-note/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const mismatches = await prisma.purchaseMismatch.findMany({
      where: { coordinationStatus: 'COORDINATED' },
      include: mismatchInclude,
      orderBy: { timestamp: 'desc' },
    });

    // Mirrors Debit-note.jsx's categorizeData eligibility: needs a debit
    // note, and isn't a return still in progress.
    const isEligibleForDebitNote = (m) => {
      const status = String(m.status || '').toLowerCase();
      if (status.includes('return')) return false;
      return status.includes('credit') || m.actionType === 'Make Debit Note' || m.actionType === 'Make Debit Note (Re-Audit)';
    };

    const pendingFromMismatch = mismatches
      .filter((m) => m.debitNotes.length === 0 && isEligibleForDebitNote(m))
      .map((m) => ({
        id: m.id,
        supabaseId: m.id,
        isManualReturn: false,
        liftId: m.lift?.liftNo || '',
        indentNo: m.lift?.indentId != null ? String(m.lift.indentId) : '',
        firmName: m.firmName || m.lift?.firmName || '',
        partyName: m.partyName || m.lift?.vendorName || '',
        productName: m.productName || m.lift?.rawMaterialName || '',
        transporterName: m.transporterName || m.lift?.transporterName || '',
        vehicleNo: m.purchaseReturns?.[0]?.vehicleNo || m.truckNo || '',
        qty: m.qty != null ? String(m.qty) : '',
        productRate: m.rate != null ? String(m.rate) : '',
        billNo: m.billNo || m.lift?.billNo || '',
        billImage: m.billImage || m.lift?.billImage || '',
        qtyDifferenceStatus: m.qtyDiffStatus || '',
        actionType: m.actionType || '',
        status: m.status || '',
        purchaseReturnNo: m.purchaseReturns?.[0]?.purchaseReturnNo || '',
        timestamp: m.timestamp ? m.timestamp.toISOString() : '',
      }));

    // Manual purchase returns that never got linked to a Mismatch — they
    // still need their own separate debit note (mirrors PurchaseReturnPage's
    // manual-entry path).
    const manualReturns = await prisma.purchasePurchaseReturn.findMany({
      where: { mismatchId: null },
      orderBy: { timeStamp: 'desc' },
    });

    const pendingFromReturns = manualReturns.map((r) => ({
      id: `return-${r.id}`,
      returnId: r.id,
      isManualReturn: true,
      liftId: r.liftNo || '',
      indentNo: r.poNo || '',
      firmName: r.firmName || '',
      partyName: r.partyName || '',
      productName: r.productName || '',
      transporterName: r.transport || '',
      vehicleNo: r.vehicleNo || '',
      qty: r.returnThisTime != null ? String(r.returnThisTime) : (r.qty != null ? String(r.qty) : ''),
      productRate: r.productRate != null ? String(r.productRate) : '',
      billNo: r.billNo || '',
      billImage: r.billImage || '',
      returnThisTime: r.returnThisTime != null ? String(r.returnThisTime) : '',
      totalReturnQty: r.totalReturnQty != null ? String(r.totalReturnQty) : '',
      creditNoteUrl: r.creditNoteUrl || '',
      purchaseReturnNo: r.purchaseReturnNo || '',
      timestamp: r.timeStamp ? r.timeStamp.toISOString() : '',
    }));

    const pending = [...pendingFromMismatch, ...pendingFromReturns];

    const debitNotes = await prisma.purchaseDebitNote.findMany({ orderBy: { createdAt: 'desc' } });
    const history = debitNotes.map((d) => ({
      id: d.id,
      supabaseId: d.id,
      liftId: d.liftNumber || d.liftId || '',
      indentNo: d.indentNumber || '',
      firmName: d.firmName || '',
      partyName: d.partyName || '',
      productName: d.productName || '',
      qty: d.qty != null ? String(d.qty) : '',
      status: d.status || '',
      actionType: d.actionType || '',
      remarks: d.remark || '',
      debitAmount: d.debitAmount != null ? String(d.debitAmount) : '',
      debitNoteUrl: d.debitNoteUrl || '',
      purchaseReturnNo: d.purchaseReturnNo || '',
      timestamp: d.createdAt ? d.createdAt.toISOString() : '',
    }));

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a debit note for a coordinated mismatch, or for a manual
//          purchase return that was never linked to a mismatch
// @route   POST /api/purchase/debit-note/submit
// @access  Private
const submitDebitNote = async (req, res, next) => {
  try {
    const { mismatchId: mismatchIdInput, returnId: returnIdInput, debitAmount, debitNoteUrl, remarks, purchaseReturnNo } = req.body;

    if (!debitAmount) {
      res.status(400);
      throw new Error('Please enter a Debit Amount.');
    }
    if (!debitNoteUrl) {
      res.status(400);
      throw new Error('Please upload a Debit Note image.');
    }

    let mismatchId = mismatchIdInput != null ? Number(mismatchIdInput) : null;

    if (!mismatchId && returnIdInput) {
      const returnId = Number(returnIdInput);
      const purchaseReturn = await prisma.purchasePurchaseReturn.findUnique({ where: { id: returnId } });
      if (!purchaseReturn) {
        res.status(404);
        throw new Error('Purchase Return record not found');
      }

      const created = await prisma.purchaseMismatch.create({
        data: {
          timestamp: new Date(),
          firmName: purchaseReturn.firmName || null,
          partyName: purchaseReturn.partyName || null,
          productName: purchaseReturn.productName || null,
          qty: purchaseReturn.totalQty,
          status: 'Completed',
          coordinationStatus: 'COORDINATED',
          actionType: 'Make Debit Note',
        },
      });
      mismatchId = created.id;

      await prisma.purchasePurchaseReturn.update({ where: { id: returnId }, data: { mismatchId } });
    }

    if (!mismatchId) {
      res.status(400);
      throw new Error('mismatchId or returnId is required');
    }

    const mismatch = await prisma.purchaseMismatch.findUnique({ where: { id: mismatchId }, include: { lift: true } });
    if (!mismatch) {
      res.status(404);
      throw new Error('Mismatch not found');
    }

    const debitNote = await prisma.purchaseDebitNote.create({
      data: {
        mismatchId,
        liftId: mismatch.lift?.liftNo || null,
        liftNumber: mismatch.lift?.liftNo || null,
        indentNumber: mismatch.lift?.indentId != null ? String(mismatch.lift.indentId) : null,
        firmName: mismatch.firmName || mismatch.lift?.firmName || null,
        partyName: mismatch.partyName || mismatch.lift?.vendorName || null,
        productName: mismatch.productName || mismatch.lift?.rawMaterialName || null,
        qty: mismatch.qty,
        status: 'Completed',
        coordinationStatus: 'COORDINATED',
        actionType: 'Make Debit Note',
        remark: remarks || null,
        debitAmount: num(debitAmount),
        debitNoteUrl,
        purchaseReturnNo: purchaseReturnNo || null,
      },
    });

    res.status(201).json({ success: true, data: { debitNoteId: debitNote.id } });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit an existing debit note record (SuperAdmin)
// @route   POST /api/purchase/debit-note/update/:debitNoteId
// @access  Private
const updateDebitNote = async (req, res, next) => {
  try {
    const debitNoteId = Number(req.params.debitNoteId);
    if (!Number.isFinite(debitNoteId)) {
      res.status(400);
      throw new Error('Invalid debitNoteId');
    }

    const { firmName, partyName, productName, qty, status, remark, debitAmount, debitNoteUrl, purchaseReturnNo } = req.body;

    await prisma.purchaseDebitNote.update({
      where: { id: debitNoteId },
      data: {
        firmName: firmName ?? undefined,
        partyName: partyName ?? undefined,
        productName: productName ?? undefined,
        qty: qty != null && qty !== '' ? num(qty) : undefined,
        status: status ?? undefined,
        remark: remark ?? undefined,
        debitAmount: debitAmount != null && debitAmount !== '' ? num(debitAmount) : undefined,
        debitNoteUrl: debitNoteUrl ?? undefined,
        purchaseReturnNo: purchaseReturnNo ?? undefined,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, submitDebitNote, updateDebitNote };
