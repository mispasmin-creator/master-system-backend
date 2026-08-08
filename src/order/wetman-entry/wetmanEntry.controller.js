const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Dispatches awaiting Wetman Entry (Load Material done, no wetmanEntry row yet)
// @route   GET /api/order/wetman-entry/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { loadMaterial: { isNot: null }, wetmanEntry: null },
      include: { receipt: true, loadMaterial: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatches with a completed Wetman Entry stage
// @route   GET /api/order/wetman-entry/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { wetmanEntry: { isNot: null } },
      include: { wetmanEntry: true, receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit weighment details for a batch of dispatches (values/images
//          shared across the whole selected batch).
// @route   POST /api/order/wetman-entry/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const {
      dispatchIds,
      actualTruckQty,
      actualQtyAsPerWeighmentSlip,
      remarks,
      imageOfSlip,
      imageOfSlip2,
      imageOfSlip3,
    } = req.body;

    if (!Array.isArray(dispatchIds) || dispatchIds.length === 0) {
      res.status(400);
      throw new Error('dispatchIds is required.');
    }
    if (actualTruckQty === undefined || actualTruckQty === null || actualTruckQty === '') {
      res.status(400);
      throw new Error('Actual Truck Qty is required.');
    }
    if (actualQtyAsPerWeighmentSlip === undefined || actualQtyAsPerWeighmentSlip === null || actualQtyAsPerWeighmentSlip === '') {
      res.status(400);
      throw new Error('Actual Qty As Per Weighment Slip is required.');
    }
    if (!imageOfSlip) {
      res.status(400);
      throw new Error('Image Of Slip is required.');
    }

    const data = {
      actualTruckQty: parseFloat(actualTruckQty),
      actualQtyAsPerWeighmentSlip: parseFloat(actualQtyAsPerWeighmentSlip),
      remarks: remarks || null,
      imageOfSlip,
      imageOfSlip2: imageOfSlip2 || null,
      imageOfSlip3: imageOfSlip3 || null,
    };

    const result = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const rawDispatchId of dispatchIds) {
        const dispatchId = parseInt(rawDispatchId, 10);
        if (Number.isNaN(dispatchId)) continue;

        const row = await upsertStageAndStampParent(tx, {
          model: tx.orderWetmanEntry,
          where: { dispatchId },
          create: { dispatchId, ...data },
          update: data,
          parentModel: tx.orderLoadMaterial,
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
