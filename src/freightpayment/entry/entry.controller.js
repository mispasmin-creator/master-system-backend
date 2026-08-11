const { prisma } = require('../../config/db');

// Helper to compute stage and delay days
const computeEntryFields = (entry) => {
  const kitting = entry.kitting;
  const audit = entry.audit;
  const posting = entry.posting;
  const release = entry.release;

  let currentStage = 'Kitting';
  if (!kitting || kitting.status !== 'Done') {
    currentStage = 'Kitting';
  } else if (!audit || audit.status !== 'Done') {
    currentStage = 'Audit';
  } else if (!posting || posting.status !== 'Done') {
    currentStage = 'Posting';
  } else if (!release || release.status !== 'Done') {
    currentStage = 'Release';
  } else {
    currentStage = 'Completed';
  }

  const msInDay = 1000 * 60 * 60 * 24;

  // Kitting delay: kitting.actualAt vs entry.plannedAt
  let kittingDelayDays = null;
  if (kitting && kitting.actualAt && entry.plannedAt) {
    const diffMs = new Date(kitting.actualAt).getTime() - new Date(entry.plannedAt).getTime();
    kittingDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  let auditDelayDays = null;
  if (audit && audit.actualAt && entry.plannedAt) {
    const diffMs = new Date(audit.actualAt).getTime() - new Date(entry.plannedAt).getTime();
    auditDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  let postingDelayDays = null;
  if (posting && posting.actualAt && kitting && kitting.nextPlannedAt) {
    const diffMs = new Date(posting.actualAt).getTime() - new Date(kitting.nextPlannedAt).getTime();
    postingDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  let releaseDelayDays = null;
  if (release && release.actualAt && posting && posting.actualAt) {
    const diffMs = new Date(release.actualAt).getTime() - new Date(posting.actualAt).getTime();
    releaseDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  return {
    ...entry,
    currentStage,
    kittingDelayDays,
    auditDelayDays,
    postingDelayDays,
    releaseDelayDays,
  };
};

// @desc    List all freight payment entries with workflow relations and computed metrics
// @route   GET /api/freightpayment/entry
const getAll = async (req, res, next) => {
  try {
    const rows = await prisma.freightPaymentEntry.findMany({
      orderBy: { id: 'desc' },
      include: {
        kitting: true,
        audit: true,
        posting: true,
        release: true,
      },
    });

    const data = rows.map(computeEntryFields);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single freight payment entry by ID
// @route   GET /api/freightpayment/entry/:id
const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || req.params.id;
    const row = await prisma.freightPaymentEntry.findUnique({
      where: { id },
      include: {
        kitting: true,
        audit: true,
        posting: true,
        release: true,
      },
    });

    if (!row) {
      return res.status(404).json({ success: false, message: 'Freight payment entry not found' });
    }

    const data = computeEntryFields(row);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new freight payment entry
// @route   POST /api/freightpayment/entry
const create = async (req, res, next) => {
  try {
    const { uniqueNumber } = req.body;

    if (!uniqueNumber || !String(uniqueNumber).trim()) {
      return res.status(400).json({ success: false, message: 'Unique Number is required.' });
    }

    const trimmedUniqueNumber = String(uniqueNumber).trim();

    const existing = await prisma.freightPaymentEntry.findUnique({
      where: { uniqueNumber: trimmedUniqueNumber },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Freight payment entry with Unique Number '${trimmedUniqueNumber}' already exists.`,
      });
    }

    // Allowlist known fields to prevent Prisma "Unknown field" errors
    const b = req.body;
    const payload = {
      uniqueNumber: trimmedUniqueNumber,
      ...(b.paymentNumber   !== undefined && { paymentNumber:   String(b.paymentNumber) }),
      ...(b.firmName        !== undefined && { firmName:        String(b.firmName) }),
      ...(b.fmsName         !== undefined && { fmsName:         String(b.fmsName) }),
      ...(b.transporterName !== undefined && { transporterName: String(b.transporterName) }),
      ...(b.vehicleNumber   !== undefined && { vehicleNumber:   String(b.vehicleNumber) }),
      ...(b.fromLocation    !== undefined && { fromLocation:    String(b.fromLocation) }),
      ...(b.toLocation      !== undefined && { toLocation:      String(b.toLocation) }),
      ...(b.materialLoadDetails !== undefined && { materialLoadDetails: String(b.materialLoadDetails) }),
      ...(b.biltyNumber     !== undefined && { biltyNumber:     String(b.biltyNumber) }),
      ...(b.rateType        !== undefined && { rateType:        String(b.rateType) }),
      ...(b.amount          != null        && { amount:          parseFloat(b.amount) }),
      ...(b.postingAmount   != null        && { postingAmount:   parseFloat(b.postingAmount) }),
      ...(b.biltyImageUrl   !== undefined && { biltyImageUrl:   String(b.biltyImageUrl) }),
      ...(b.liftId          !== undefined && { liftId:          String(b.liftId) }),
      ...(b.partyName       !== undefined && { partyName:       String(b.partyName) }),
      ...(b.billingQty      != null        && { billingQty:      parseFloat(b.billingQty) }),
      ...(b.billNumber      !== undefined && { billNumber:      String(b.billNumber) }),
      ...(b.batchNumber     !== undefined && { batchNumber:     String(b.batchNumber) }),
      ...(b.plannedAt       !== undefined && { plannedAt:       new Date(b.plannedAt) }),
      ...(b.actualAt        !== undefined && { actualAt:        new Date(b.actualAt) }),
      ...(b.remark          !== undefined && { remark:          String(b.remark) }),
    };

    const data = await prisma.freightPaymentEntry.create({
      data: payload,
      include: {
        kitting: true,
        audit: true,
        posting: true,
        release: true,
      },
    });

    res.status(201).json({ success: true, data: computeEntryFields(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch lookup by Lift ID / D-Sr Number
// @route   GET /api/freightpayment/entry/dispatch-lookup/:liftId
const getDispatchInfo = async (req, res, next) => {
  try {
    const { liftId } = req.params;

    if (!liftId) {
      return res.json({ success: true, data: null });
    }

    const dispatch = await prisma.orderDispatch.findFirst({
      where: { dSrNumber: String(liftId).trim() },
      include: {
        logistic: true,
      },
    });

    if (!dispatch || !dispatch.logistic) {
      return res.json({ success: true, data: null });
    }

    const log = dispatch.logistic;
    let computedAmount = null;

    if (log.fixedAmount !== null && log.fixedAmount !== undefined && log.fixedAmount > 0) {
      computedAmount = log.fixedAmount;
    } else if (log.transportRatePerMt && log.actualTruckQty) {
      computedAmount = log.transportRatePerMt * log.actualTruckQty;
    }

    res.json({
      success: true,
      data: {
        liftId: dispatch.dSrNumber,
        partyName: dispatch.partyName,
        productName: dispatch.productName,
        transporterName: log.transporterName,
        truckNo: log.truckNo,
        biltyNo: log.biltyNo,
        actualTruckQty: log.actualTruckQty,
        computedAmount,
        logistic: log,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, getDispatchInfo };
