const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Delivery rows awaiting CRM (Bilty done, no crm row yet)
// @route   GET /api/order/crm/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const deliveries = await prisma.orderDelivery.findMany({
      where: { bilty: { isNot: null }, crm: null },
      include: { bilty: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

// @desc    Delivery rows with CRM completed
// @route   GET /api/order/crm/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const deliveries = await prisma.orderDelivery.findMany({
      where: { crm: { isNot: null } },
      include: { crm: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark CRM done for a single Delivery row. Only creates/stamps the
//          OrderCrm row — deliberately does NOT touch OrderMaterialReceipt
//          (the reference app's Crm.jsx inserts a second, mostly-empty
//          "POST DELIVERY" row here, which conflicts with the row already
//          created by the Bilty Update stage; that duplicate insert is
//          dead/conflicting code and is intentionally not reproduced).
// @route   POST /api/order/crm
// @access  Private
const markDone = async (req, res, next) => {
  try {
    const { deliveryId } = req.body;
    const id = parseInt(deliveryId, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid delivery id.');
    }

    const result = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.orderCrm,
      where: { deliveryId: id },
      create: { deliveryId: id },
      update: {},
      parentModel: tx.orderBilty,
      parentWhere: { deliveryId: id },
    }));

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, markDone };
