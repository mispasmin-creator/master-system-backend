const { prisma } = require('../../config/db');

// @desc    Get all kitting records
// @route   GET /api/freightpayment/kitting
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.freightPaymentKitting.findMany({
      orderBy: { id: 'desc' },
      include: {
        entry: true,
      },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single kitting record by entryId or kitting id
// @route   GET /api/freightpayment/kitting/:id
const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || req.params.id;
    let data = await prisma.freightPaymentKitting.findUnique({
      where: { id },
      include: { entry: true },
    });

    if (!data) {
      data = await prisma.freightPaymentKitting.findUnique({
        where: { entryId: id },
        include: { entry: true },
      });
    }

    if (!data) return res.status(404).json({ success: false, message: 'Kitting record not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Kitting stage and cascade reset downstream stages
// @route   PATCH /api/freightpayment/kitting/:entryId/complete
const complete = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.entryId, 10) || req.params.entryId;
    const { remark } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      const entry = await tx.freightPaymentEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        const err = new Error('Freight Payment Entry not found');
        err.statusCode = 404;
        throw err;
      }

      const now = new Date();

      // 1. Upsert FreightPaymentKitting row
      const kitting = await tx.freightPaymentKitting.upsert({
        where: { entryId },
        update: {
          status: 'Done',
          actualAt: now,
          nextPlannedAt: now,
          remark: remark !== undefined ? remark : undefined,
          updatedAt: now,
        },
        create: {
          entryId,
          status: 'Done',
          actualAt: now,
          nextPlannedAt: now,
          remark: remark || null,
          updatedAt: now,
        },
      });

      // 2. Update parent Entry actualAt timestamp
      await tx.freightPaymentEntry.update({
        where: { id: entryId },
        data: {
          actualAt: now,
          updatedAt: now,
        },
      });

      // 3. Cascade reset downstream stage rows back to 'Not Done' if they exist
      const existingAudit = await tx.freightPaymentAudit.findUnique({ where: { entryId } });
      if (existingAudit) {
        await tx.freightPaymentAudit.update({
          where: { entryId },
          data: { status: 'Not Done', updatedAt: now },
        });
      }

      const existingPosting = await tx.freightPaymentPosting.findUnique({ where: { entryId } });
      if (existingPosting) {
        await tx.freightPaymentPosting.update({
          where: { entryId },
          data: { status: 'Not Done', updatedAt: now },
        });
      }

      const existingRelease = await tx.freightPaymentRelease.findUnique({ where: { entryId } });
      if (existingRelease) {
        await tx.freightPaymentRelease.update({
          where: { entryId },
          data: { status: 'Not Done', updatedAt: now },
        });
      }

      return kitting;
    });

    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Reopen Kitting stage (set status to 'Not Done')
// @route   PATCH /api/freightpayment/kitting/:entryId/reopen
const reopen = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.entryId, 10) || req.params.entryId;
    const now = new Date();

    const data = await prisma.freightPaymentKitting.upsert({
      where: { entryId },
      update: {
        status: 'Not Done',
        updatedAt: now,
      },
      create: {
        entryId,
        status: 'Not Done',
        updatedAt: now,
      },
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create entry and complete kitting stage
// @route   POST /api/freightpayment/kitting
const createOrComplete = async (req, res, next) => {
  try {
    const { uniqueNumber } = req.body;
    if (!uniqueNumber || !String(uniqueNumber).trim()) {
      return res.status(400).json({ success: false, message: 'Unique Number is required.' });
    }
    const trimmedUniqueNumber = String(uniqueNumber).trim();

    const now = new Date();
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

    const entry = await prisma.freightPaymentEntry.upsert({
      where: { uniqueNumber: trimmedUniqueNumber },
      update: payload,
      create: payload,
    });

    const kitting = await prisma.freightPaymentKitting.upsert({
      where: { entryId: entry.id },
      update: {
        status: 'Done',
        actualAt: now,
        nextPlannedAt: now,
        remark: b.remark || b.remark3 || undefined,
        updatedAt: now,
      },
      create: {
        entryId: entry.id,
        status: 'Done',
        actualAt: now,
        nextPlannedAt: now,
        remark: b.remark || b.remark3 || null,
        updatedAt: now,
      },
    });

    res.status(201).json({ success: true, data: kitting });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, complete, reopen, createOrComplete };
