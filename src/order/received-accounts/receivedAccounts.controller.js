const { prisma } = require('../../config/db');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// @desc    Order receipts awaiting Received Accounts (Check PO done, no
//          receivedAccounts row yet)
// @route   GET /api/order/received-accounts/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { checkPo: { isNot: null }, receivedAccounts: null },
      include: { checkPo: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Order receipts with Received Accounts completed
// @route   GET /api/order/received-accounts/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { receivedAccounts: { isNot: null } },
      include: { receivedAccounts: true, checkDelivery: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });
    const data = rows.map(({ checkDelivery, ...row }) => ({ ...row, canRevert: !checkDelivery }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark accounts received for one or more receipt ids ("Mark All
//          Received", bulk over a PO group)
// @route   POST /api/order/received-accounts
// @access  Private
const markReceived = async (req, res, next) => {
  try {
    const { receiptIds } = req.body;
    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      res.status(400);
      throw new Error('receiptIds must be a non-empty array.');
    }

    const results = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const idRaw of receiptIds) {
        const receiptId = parseInt(idRaw, 10);
        if (Number.isNaN(receiptId)) continue;
        const row = await upsertStageAndStampParent(tx, {
          model: tx.orderReceivedAccounts,
          where: { receiptId },
          create: { receiptId },
          update: {},
          parentModel: tx.orderCheckPo,
          parentWhere: { receiptId },
        });
        rows.push(row);
      }
      return rows;
    });

    res.status(201).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo Received Accounts — refused if Check for Delivery already completed
// @route   POST /api/order/received-accounts/:receiptId/revert
// @access  Private
const revert = async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.receiptId, 10);
    if (Number.isNaN(receiptId)) {
      res.status(400);
      throw new Error('Invalid receipt id.');
    }

    const reverted = await prisma.$transaction((tx) => revertStage(tx, {
      model: tx.orderReceivedAccounts,
      where: { receiptId },
      childModel: tx.orderCheckDelivery,
      childWhere: { receiptId },
      parentModel: tx.orderCheckPo,
      parentWhere: { receiptId },
    }));

    res.json({ success: true, data: reverted });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, markReceived, revert };
