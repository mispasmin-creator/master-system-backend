const { prisma } = require('../../config/db');

// ---------------------------------------------------------------------------
// Accounts Audit chain (reference: Audit-data.jsx / AccountsAudit.jsx).
//
// The legacy Mismatch sheet tracked this as 5 numbered Planned/Actual/Status/
// Remarks column pairs bolted onto one wide row. The Prisma schema already
// splits each checkpoint into its own table (see the "Done" -> nextTable
// comments on each model in schema.prisma), so a stage's row EXISTING is the
// signal that checkpoint was submitted — mirroring how purchase_poEntry /
// purchase_bilty etc. already work elsewhere in this backend. This module
// reconstructs the pending/history gating for each stage from that existence
// signal instead of the old Planned/Actual timestamp pair.
//
// Chain: Audit -> (Done) -> Tally Entry -> (Done) -> Bill Entry -> (Done) -> History
//                 (Not Done) -> Rectify -> (Done) -> Re-Audit -> (Done) -> Tally Entry
// ---------------------------------------------------------------------------

const STAGES = {
  audit: { model: 'purchaseAAAudit', relation: 'aaAudits' },
  rectify: { model: 'purchaseAARectify', relation: 'aaRectifies' },
  reaudit: { model: 'purchaseAAReAudit', relation: 'aaReAudits' },
  'tally-entry': { model: 'purchaseAATallyEntry', relation: 'aaTallyEntries' },
  rechecking: { custom: true },
  'bill-entry': { model: 'purchaseAABillEntry', relation: 'aaBillEntries' },
};

const FOR_TRANSPORTER_BYPASS = ['FOR', 'OWNED TRUCK', 'BY COMPANY'];

const mismatchInclude = {
  lift: { include: { indent: true, fullkitting: true, receipt: true, lab: true, bilty: true } },
  aaAudits: true,
  aaRectifies: true,
  aaReAudits: true,
  aaTallyEntries: true,
  aaBillEntries: true,
  auditHistories: true,
};

const toRow = (m) => {
  const l = m.lift;
  return {
    id: m.id,
    supabaseId: m.id,
    liftNumber: l?.liftNo || '',
    indentNumber: l?.indentId != null ? String(l.indentId) : '',
    firmName: m.firmName || l?.firmName || '',
    partyName: m.partyName || l?.vendorName || '',
    vendorName: m.partyName || l?.vendorName || '',
    productName: m.productName || l?.rawMaterialName || '',
    type: m.type || l?.type || '',
    billNo: m.billNo || l?.billNo || '',
    qty: m.qty != null ? String(m.qty) : '',
    liftingQty: l?.liftingQty != null ? String(l.liftingQty) : '',
    areaLifting: m.areaLifting || l?.areaLifting || '',
    truckNo: m.truckNo || l?.truckNo || '',
    transporterName: m.transporterName || l?.transporterName || '',
    billImage: m.billImage || l?.billImage || '',
    biltyNo: m.biltyNo || l?.biltyNo || '',
    biltyImage: m.biltyImage || l?.biltyImage || '',
    typeOfRate: m.typeOfRate || '',
    rate: m.rate != null ? String(m.rate) : '',
    truckQty: m.truckQty != null ? String(m.truckQty) : '',
    qtyDifferenceStatus: m.qtyDiffStatus || '',
    differenceQty: m.diffQty != null ? String(m.diffQty) : '',
    weightSlip: m.weightSlip || '',
    transporterRate: l?.transporterRate != null ? String(l.transporterRate) : '',
    dateOfBill: l?.dateOfBill ? l.dateOfBill.toISOString() : '',
    dateOfReceiving: '',
    poRate: '',
    totalFreight: m.totalFreight != null ? String(m.totalFreight) : '',
    debitAmount: '',
    debitNoteUrl: '',
    status: m.status || '',
    remarks: m.remarks || '',
    auditStatus: m.aaAudits?.[0]?.status || '',
    auditRemarks: m.aaAudits?.[0]?.remarks || '',
    rectifyStatus: m.aaRectifies?.[0]?.status || '',
    rectifyRemarks: m.aaRectifies?.[0]?.remarks || '',
    reAuditStatus: m.aaReAudits?.[0]?.status || '',
    reauditRemarks: m.aaReAudits?.[0]?.remarks || '',
    tallyStatus: m.aaTallyEntries?.[0]?.status || '',
    tallyRemarks: m.aaTallyEntries?.[0]?.remarks || '',
    billStatus: m.aaBillEntries?.[0]?.status || '',
    billRemarks: m.aaBillEntries?.[0]?.remarks || '',
    timestamp: m.timestamp ? m.timestamp.toISOString() : '',
  };
};

const isBypassed = (m) => {
  const transporter = String(m.transporterName || m.transporter || '').trim().toUpperCase();
  if (FOR_TRANSPORTER_BYPASS.includes(transporter)) return true;
  const firm = String(m.firmName || m.lift?.firmName || '').trim().toUpperCase();
  if ((firm === 'RKL' || firm === 'PURAB') && transporter === 'FOR') return true;
  if ((firm === 'PMMPL' || firm === 'PMPL') && (transporter === 'EX FACTORY TRANSPORTER' || transporter === 'EX FACTORY')) return true;
  return false;
};

// Every lift eventually needs an audit entry, mismatch or not — the legacy
// "Mismatch" sheet doubled as the universal per-lift tracking table for this
// whole downstream workflow (see schema.prisma's "Accounts Audit... seed
// rows here" comment on PurchaseMismatch). Lifts that never triggered a
// genuine mismatch still show up here once kitting is ready/bypassed, and
// submitting their audit entry seeds a new PurchaseMismatch row for them
// (mirrors the reference's `isNewFromLift` insert branch).
const liftToAuditRow = (l) => ({
  id: `lift_${l.id}`,
  supabaseId: null,
  liftId: l.id,
  isNewFromLift: true,
  liftNumber: l.liftNo || '',
  indentNumber: l.indentId != null ? String(l.indentId) : '',
  firmName: l.firmName || '',
  partyName: l.vendorName || '',
  vendorName: l.vendorName || '',
  productName: l.rawMaterialName || '',
  type: l.type || '',
  billNo: l.billNo || '',
  qty: l.qty != null ? String(l.qty) : '',
  liftingQty: l.liftingQty != null ? String(l.liftingQty) : '',
  areaLifting: l.areaLifting || '',
  truckNo: l.truckNo || '',
  transporterName: l.transporterName || '',
  billImage: l.billImage || '',
  biltyNo: l.biltyNo || '',
  biltyImage: l.biltyImage || '',
  typeOfRate: l.typeOfTransportingRate || '',
  rate: l.rate != null ? String(l.rate) : '',
  truckQty: l.truckQty != null ? String(l.truckQty) : '',
  qtyDifferenceStatus: '0.000',
  differenceQty: '0.000',
  weightSlip: '',
  transporterRate: l.transporterRate != null ? String(l.transporterRate) : '',
  dateOfBill: l.dateOfBill ? l.dateOfBill.toISOString() : '',
  dateOfReceiving: '',
  poRate: '',
  totalFreight: l.transporterRate != null ? String(l.transporterRate) : '',
  debitAmount: '',
  debitNoteUrl: '',
  status: '',
  remarks: '',
  currentStage: 'AUDIT',
  timestamp: l.timestamp ? l.timestamp.toISOString() : '',
});

// @desc    List all mismatches bucketed into each Accounts Audit stage
// @route   GET /api/purchase/accounts-audit/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const mismatches = await prisma.purchaseMismatch.findMany({
      include: mismatchInclude,
      orderBy: { timestamp: 'desc' },
    });

    const audit = [];
    const rectify = [];
    const reaudit = [];
    const tallyEntry = [];
    const rechecking = [];
    const billEntry = [];
    const history = [];

    for (const m of mismatches) {
      const hasAudit = m.aaAudits.length > 0;
      const hasRectify = m.aaRectifies.length > 0;
      const hasReAudit = m.aaReAudits.length > 0;
      const hasTallyEntry = m.aaTallyEntries.length > 0;
      const hasBillEntry = m.aaBillEntries.length > 0;
      const hasHistory = m.auditHistories.length > 0;

      const auditDone = m.aaAudits.some((a) => a.status === 'Done');
      const auditNotDone = hasAudit && !auditDone;
      const rectifyDone = m.aaRectifies.some((r) => r.status === 'Done');
      const reAuditDone = m.aaReAudits.some((r) => r.status === 'Done');
      const tallyEntryDone = m.aaTallyEntries.some((t) => t.status === 'Done');
      const recheckingDone = m.actionType === 'RECHECKING_APPROVED';

      const l = m.lift;
      let isReadyForAudit = true;
      if (l) {
        if (!l.receipt) isReadyForAudit = false;
        else if (l.receipt.unloadApprovalRequired === 'Yes' && !l.receipt.unloadApprovalStatus) isReadyForAudit = false;
        else if (!l.lab) isReadyForAudit = false;
        else if (!Boolean(l.bilty) && !isBypassed({ transporterName: l.transporterName, firmName: l.firmName })) isReadyForAudit = false;
      }

      if (!hasAudit && isReadyForAudit) audit.push({ ...toRow(m), currentStage: 'AUDIT' });
      if (auditNotDone && !hasRectify) rectify.push({ ...toRow(m), currentStage: 'RECTIFY' });
      if (rectifyDone && !hasReAudit) reaudit.push({ ...toRow(m), currentStage: 'REAUDIT' });
      if ((auditDone || reAuditDone) && !tallyEntryDone) tallyEntry.push({ ...toRow(m), currentStage: 'TALLY_ENTRY' });
      if (tallyEntryDone && !recheckingDone && !hasBillEntry) rechecking.push({ ...toRow(m), currentStage: 'RECHECKING' });
      if (tallyEntryDone && recheckingDone && !hasBillEntry) billEntry.push({ ...toRow(m), currentStage: 'BILL_ENTRY' });
      if (hasHistory) history.push({ ...toRow(m), currentStage: 'HISTORY' });
    }

    // Lifts that never triggered a mismatch but are ready to be audited.
    const mismatchedLiftIds = new Set(mismatches.filter((m) => m.liftId != null).map((m) => m.liftId));
    const untrackedLifts = await prisma.purchaseLift.findMany({
      where: { id: { notIn: Array.from(mismatchedLiftIds) } },
      include: { 
        fullkitting: true,
        receipt: true,
        lab: true,
        bilty: true,
      },
    });
    for (const l of untrackedLifts) {
      if (!l.receipt) continue;
      if (l.receipt.unloadApprovalRequired === 'Yes' && !l.receipt.unloadApprovalStatus) continue;
      if (!l.lab) continue;
      
      const isBiltyDone = Boolean(l.bilty) || isBypassed({ transporterName: l.transporterName, firmName: l.firmName });
      if (isBiltyDone) {
        console.log(`Pushing untracked lift ${l.liftNo} to AUDIT array.`);
        audit.push(liftToAuditRow(l));
      } else {
        console.log(`Untracked lift ${l.liftNo} failed isBiltyDone check.`);
      }
    }

    console.log(`Total audits: ${audit.length}`);
    res.json({
      success: true,
      data: { audit, rectify, reaudit, tallyEntry, rechecking, billEntry, history },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit an entry for a given Accounts Audit stage
// @route   POST /api/purchase/accounts-audit/:stage/submit/:mismatchId
// @access  Private
const submitStage = async (req, res, next) => {
  try {
    const stageKey = req.params.stage;
    const stage = STAGES[stageKey];
    if (!stage) {
      res.status(400);
      throw new Error(`Unknown stage: ${stageKey}`);
    }

    let mismatchId;
    const rawId = req.params.mismatchId;

    if (rawId.startsWith('lift_')) {
      // Lift never had a genuine mismatch — seed one now (mirrors the
      // reference's isNewFromLift insert branch), only valid for the audit
      // stage since that's the entry point into this chain.
      if (stageKey !== 'audit') {
        res.status(400);
        throw new Error('Only the audit stage can seed a new mismatch from a lift');
      }
      const liftId = Number(rawId.slice('lift_'.length));
      if (!Number.isFinite(liftId)) {
        res.status(400);
        throw new Error('Invalid lift id');
      }
      const lift = await prisma.purchaseLift.findUnique({ where: { id: liftId } });
      if (!lift) {
        res.status(404);
        throw new Error('Lift not found');
      }
      const created = await prisma.purchaseMismatch.create({
        data: {
          timestamp: new Date(),
          liftId,
          firmName: lift.firmName || null,
          partyName: lift.vendorName || null,
          productName: lift.rawMaterialName || null,
          qty: lift.qty,
          type: lift.type || null,
          billNo: lift.billNo || null,
          areaLifting: lift.areaLifting || null,
          truckNo: lift.truckNo || null,
          transporterName: lift.transporterName || null,
          billImage: lift.billImage || null,
          biltyNo: lift.biltyNo || null,
          biltyImage: lift.biltyImage || null,
          rate: lift.rate,
          truckQty: lift.truckQty,
          totalFreight: lift.transporterRate,
          status: 'Pending',
        },
      });
      mismatchId = created.id;
    } else {
      mismatchId = Number(rawId);
    }

    if (!Number.isFinite(mismatchId)) {
      res.status(400);
      throw new Error('Invalid mismatchId');
    }

    const mismatch = await prisma.purchaseMismatch.findUnique({
      where: { id: mismatchId },
      include: { lift: true },
    });
    if (!mismatch) {
      res.status(404);
      throw new Error('Mismatch not found');
    }

    const { status, remarks } = req.body;

    if (stageKey === 'rechecking') {
      if (status === 'Done') {
        await prisma.purchaseMismatch.update({
          where: { id: mismatchId },
          data: {
            actionType: 'RECHECKING_APPROVED',
            status: 'Rechecking Approved',
            remarks: remarks || mismatch.remarks,
          },
        });
        return res.status(201).json({ success: true, message: 'Rechecking approved' });
      } else {
        // Option A: Reject sends back to Tally Entry
        await prisma.purchaseAATallyEntry.updateMany({
          where: { mismatchId },
          data: {
            status: 'Not Done',
            remarks: remarks ? `Rejected in Rechecking: ${remarks}` : 'Rejected in Rechecking',
          },
        });
        await prisma.purchaseMismatch.update({
          where: { id: mismatchId },
          data: {
            actionType: 'RECHECKING_REJECTED',
            status: 'Rechecking Rejected',
            remarks: remarks || mismatch.remarks,
          },
        });
        return res.status(201).json({ success: true, message: 'Rechecking rejected - returned to Tally Entry' });
      }
    }

    if (stageKey === 'tally-entry') {
      // Clear any prior rechecking rejection state when resubmitting tally entry
      await prisma.purchaseMismatch.update({
        where: { id: mismatchId },
        data: {
          actionType: null,
          status: status === 'Done' ? 'Tally Entry Done' : 'Tally Entry Pending',
        },
      });
    }

    const created = await prisma[stage.model].create({
      data: {
        mismatchId,
        liftNumber: mismatch.lift?.liftNo || null,
        status: status || null,
        remarks: remarks || null,
      },
    });

    // Bill Entry stage completing successfully is terminal — mirrors the
    // schema's "Done" -> purchase_auditHistory comment.
    if (stageKey === 'bill-entry' && status === 'Done') {
      await prisma.purchaseAuditHistory.create({
        data: {
          mismatchId,
          liftId: mismatch.lift?.liftNo || null,
          liftNumber: mismatch.lift?.liftNo || null,
          firmName: mismatch.firmName || mismatch.lift?.firmName || null,
          partyName: mismatch.partyName || mismatch.lift?.vendorName || null,
          productName: mismatch.productName || mismatch.lift?.rawMaterialName || null,
        },
      });
    }

    res.status(201).json({ success: true, data: { id: created.id } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, submitStage };
