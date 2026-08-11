const { prisma } = require('../../config/db');

// Helper to compute posting delay days
const computePostingDelay = (posting) => {
  if (!posting) return posting;
  const msInDay = 1000 * 60 * 60 * 24;
  let postingDelayDays = null;

  if (posting.actualAt && posting.entry && posting.entry.kitting && posting.entry.kitting.nextPlannedAt) {
    const diffMs = new Date(posting.actualAt).getTime() - new Date(posting.entry.kitting.nextPlannedAt).getTime();
    postingDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  return {
    ...posting,
    postingDelayDays,
  };
};

// @desc    Get all posting stage records
// @route   GET /api/freightpayment/posting
const getAll = async (req, res, next) => {
  try {
    const rows = await prisma.freightPaymentPosting.findMany({
      orderBy: { id: 'desc' },
      include: {
        entry: {
          include: {
            kitting: true,
          },
        },
      },
    });

    const data = rows.map(computePostingDelay);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single posting stage record by entryId or posting id
// @route   GET /api/freightpayment/posting/:id
const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || req.params.id;
    let row = await prisma.freightPaymentPosting.findUnique({
      where: { id },
      include: {
        entry: {
          include: {
            kitting: true,
          },
        },
      },
    });

    if (!row) {
      row = await prisma.freightPaymentPosting.findUnique({
        where: { entryId: id },
        include: {
          entry: {
            include: {
              kitting: true,
            },
          },
        },
      });
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'Posting record not found' });
    }

    res.json({ success: true, data: computePostingDelay(row) });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Posting stage
// @route   PATCH /api/freightpayment/posting/:entryId/complete
const complete = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.entryId, 10) || req.params.entryId;
    const { remark, batchNumber } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      const audit = await tx.freightPaymentAudit.findUnique({
        where: { entryId },
      });

      if (!audit || audit.status !== 'Done') {
        const err = new Error('Audit must be completed first');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();

      const posting = await tx.freightPaymentPosting.upsert({
        where: { entryId },
        update: {
          status: 'Done',
          actualAt: now,
          remark: remark !== undefined ? remark : undefined,
          batchNumber: batchNumber !== undefined ? batchNumber : undefined,
          updatedAt: now,
        },
        create: {
          entryId,
          status: 'Done',
          actualAt: now,
          remark: remark || null,
          batchNumber: batchNumber || null,
          updatedAt: now,
        },
        include: {
          entry: {
            include: {
              kitting: true,
            },
          },
        },
      });

      return posting;
    });

    res.json({ success: true, data: computePostingDelay(data) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getOne, complete };
