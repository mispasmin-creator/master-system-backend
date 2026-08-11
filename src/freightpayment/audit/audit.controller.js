const { prisma } = require('../../config/db');

// Helper to compute audit delay days
const computeAuditDelay = (audit) => {
  if (!audit) return audit;
  const msInDay = 1000 * 60 * 60 * 24;
  let auditDelayDays = null;

  if (audit.actualAt && audit.entry && audit.entry.plannedAt) {
    const diffMs = new Date(audit.actualAt).getTime() - new Date(audit.entry.plannedAt).getTime();
    auditDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  return {
    ...audit,
    auditDelayDays,
  };
};

// @desc    Get all audit stage records
// @route   GET /api/freightpayment/audit
const getAll = async (req, res, next) => {
  try {
    const rows = await prisma.freightPaymentAudit.findMany({
      orderBy: { id: 'desc' },
      include: {
        entry: true,
      },
    });

    const data = rows.map(computeAuditDelay);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single audit stage record by entryId or audit id
// @route   GET /api/freightpayment/audit/:id
const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || req.params.id;
    let row = await prisma.freightPaymentAudit.findUnique({
      where: { id },
      include: { entry: true },
    });

    if (!row) {
      row = await prisma.freightPaymentAudit.findUnique({
        where: { entryId: id },
        include: { entry: true },
      });
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'Audit record not found' });
    }

    res.json({ success: true, data: computeAuditDelay(row) });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Audit stage
// @route   PATCH /api/freightpayment/audit/:entryId/complete
const complete = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.entryId, 10) || req.params.entryId;
    const { amount, remark, auditImageUrl, batchNumber } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      // Verify the entry exists (kitting completion is not a hard prerequisite —
      // entries may arrive from imports that bypass the kitting step)
      const entry = await tx.freightPaymentEntry.findUnique({ where: { id: entryId } });
      if (!entry) {
        const err = new Error('Freight Payment Entry not found');
        err.statusCode = 404;
        throw err;
      }

      const now = new Date();

      const audit = await tx.freightPaymentAudit.upsert({
        where: { entryId },
        update: {
          status: 'Done',
          actualAt: now,
          amount: amount !== undefined && amount !== null ? parseFloat(amount) : undefined,
          remark: remark !== undefined ? remark : undefined,
          auditImageUrl: auditImageUrl !== undefined ? auditImageUrl : undefined,
          batchNumber: batchNumber !== undefined ? batchNumber : undefined,
          updatedAt: now,
        },
        create: {
          entryId,
          status: 'Done',
          actualAt: now,
          amount: amount !== undefined && amount !== null ? parseFloat(amount) : null,
          remark: remark || null,
          auditImageUrl: auditImageUrl || null,
          batchNumber: batchNumber || null,
          updatedAt: now,
        },
        include: {
          entry: true,
        },
      });

      return audit;
    });

    res.json({ success: true, data: computeAuditDelay(data) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getOne, complete };
