const { prisma } = require('../../config/db');

// Helper to compute release delay days
const computeReleaseDelay = (release) => {
  if (!release) return release;
  const msInDay = 1000 * 60 * 60 * 24;
  let releaseDelayDays = null;

  if (release.actualAt && release.entry && release.entry.posting && release.entry.posting.actualAt) {
    const diffMs = new Date(release.actualAt).getTime() - new Date(release.entry.posting.actualAt).getTime();
    releaseDelayDays = Math.max(0, Math.floor(diffMs / msInDay));
  }

  return {
    ...release,
    releaseDelayDays,
  };
};

// @desc    Get all release stage records
// @route   GET /api/freightpayment/release
const getAll = async (req, res, next) => {
  try {
    const rows = await prisma.freightPaymentRelease.findMany({
      orderBy: { id: 'desc' },
      include: {
        entry: {
          include: {
            posting: true,
          },
        },
      },
    });

    const data = rows.map(computeReleaseDelay);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single release stage record by entryId or release id
// @route   GET /api/freightpayment/release/:id
const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || req.params.id;
    let row = await prisma.freightPaymentRelease.findUnique({
      where: { id },
      include: {
        entry: {
          include: {
            posting: true,
          },
        },
      },
    });

    if (!row) {
      row = await prisma.freightPaymentRelease.findUnique({
        where: { entryId: id },
        include: {
          entry: {
            include: {
              posting: true,
            },
          },
        },
      });
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'Release record not found' });
    }

    res.json({ success: true, data: computeReleaseDelay(row) });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Release stage
// @route   PATCH /api/freightpayment/release/:entryId/complete
const complete = async (req, res, next) => {
  try {
    const entryId = parseInt(req.params.entryId, 10) || req.params.entryId;
    const { remark, transporterBillImageUrl, batchNumber } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      const posting = await tx.freightPaymentPosting.findUnique({
        where: { entryId },
      });

      if (!posting || posting.status !== 'Done') {
        const err = new Error('Posting must be completed first');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();

      const release = await tx.freightPaymentRelease.upsert({
        where: { entryId },
        update: {
          status: 'Done',
          actualAt: now,
          remark: remark !== undefined ? remark : undefined,
          transporterBillImageUrl: transporterBillImageUrl !== undefined ? transporterBillImageUrl : undefined,
          batchNumber: batchNumber !== undefined ? batchNumber : undefined,
          updatedAt: now,
        },
        create: {
          entryId,
          status: 'Done',
          actualAt: now,
          remark: remark || null,
          transporterBillImageUrl: transporterBillImageUrl || null,
          batchNumber: batchNumber || null,
          updatedAt: now,
        },
        include: {
          entry: {
            include: {
              posting: true,
            },
          },
        },
      });

      return release;
    });

    res.json({ success: true, data: computeReleaseDelay(data) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getOne, complete };
