const { prisma } = require('../../config/db');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// @desc    Order receipts awaiting Check PO (no checkPo row yet)
// @route   GET /api/order/check-po/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { checkPo: null },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Order receipts with a completed Check PO
// @route   GET /api/order/check-po/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { checkPo: { isNot: null } },
      include: { checkPo: true, receivedAccounts: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });
    const data = rows.map(({ receivedAccounts, ...row }) => ({
      ...row,
      canRevert: !receivedAccounts,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Set the Expected Delivery Date and close Check PO for a receipt
// @route   POST /api/order/check-po/:receiptId
// @access  Private
const upsertCheckPo = async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.receiptId, 10);
    if (Number.isNaN(receiptId)) {
      res.status(400);
      throw new Error('Invalid receipt id.');
    }

    const { expectedDeliveryDate } = req.body;
    if (!expectedDeliveryDate) {
      res.status(400);
      throw new Error('Expected Delivery Date is required.');
    }

    const data = { expectedDeliveryDate: new Date(expectedDeliveryDate) };

    const result = await prisma.$transaction(async (tx) => {
      const row = await upsertStageAndStampParent(tx, {
        model: tx.orderCheckPo,
        where: { receiptId },
        create: { receiptId, ...data },
        update: data,
        parentModel: tx.orderReceipt,
        parentWhere: { id: receiptId },
      });
      // Also mirrored onto the receipt itself — several downstream pages
      // (Invoice, reporting) read Expected Delivery Date straight off
      // ORDER RECEIPT rather than joining Check PO.
      await tx.orderReceipt.update({ where: { id: receiptId }, data: { expectedDeliveryDate: data.expectedDeliveryDate } });
      return row;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo Check PO — refused if Received Accounts already completed
// @route   POST /api/order/check-po/:receiptId/revert
// @access  Private
const revert = async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.receiptId, 10);
    if (Number.isNaN(receiptId)) {
      res.status(400);
      throw new Error('Invalid receipt id.');
    }

    const reverted = await prisma.$transaction((tx) => revertStage(tx, {
      model: tx.orderCheckPo,
      where: { receiptId },
      childModel: tx.orderReceivedAccounts,
      childWhere: { receiptId },
      parentModel: tx.orderReceipt,
      parentWhere: { id: receiptId },
    }));

    res.json({ success: true, data: reverted });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, upsertCheckPo, revert };
