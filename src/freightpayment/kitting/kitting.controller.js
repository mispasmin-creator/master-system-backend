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

module.exports = { getAll, getOne, complete, reopen };
