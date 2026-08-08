const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Dispatches awaiting Load Material (Logistic done, no loadMaterial row yet)
// @route   GET /api/order/load-material/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { logistic: { isNot: null }, loadMaterial: null },
      include: { receipt: true, logistic: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatches with a completed Load Material stage
// @route   GET /api/order/load-material/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { loadMaterial: { isNot: null } },
      include: { loadMaterial: true, receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit loading images for a batch of dispatches (images shared
//          across the whole selected batch).
// @route   POST /api/order/load-material/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const { dispatchIds, loadingImage1, loadingImage2, loadingImage3 } = req.body;

    if (!Array.isArray(dispatchIds) || dispatchIds.length === 0) {
      res.status(400);
      throw new Error('dispatchIds is required.');
    }
    if (!loadingImage1) {
      res.status(400);
      throw new Error('Loading Image 1 is required.');
    }

    const data = {
      loadingImage1,
      loadingImage2: loadingImage2 || null,
      loadingImage3: loadingImage3 || null,
    };

    const result = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const rawDispatchId of dispatchIds) {
        const dispatchId = parseInt(rawDispatchId, 10);
        if (Number.isNaN(dispatchId)) continue;

        const row = await upsertStageAndStampParent(tx, {
          model: tx.orderLoadMaterial,
          where: { dispatchId },
          create: { dispatchId, ...data },
          update: data,
          parentModel: tx.orderLogistic,
          parentWhere: { dispatchId },
        });
        created.push(row);
      }
      return created;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
