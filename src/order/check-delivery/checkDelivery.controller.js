const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Order receipts awaiting Check for Delivery (Received Accounts
//          done, no checkDelivery row yet)
// @route   GET /api/order/check-delivery/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { receivedAccounts: { isNot: null }, checkDelivery: null },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Order receipts with Check for Delivery completed
// @route   GET /api/order/check-delivery/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: { checkDelivery: { isNot: null } },
      include: { checkDelivery: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Record stock-availability check for a receipt: In Stock / For
//          Production Planning / From Purchase.
// @route   POST /api/order/check-delivery/:receiptId
// @access  Private
const upsertCheckDelivery = async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.receiptId, 10);
    if (Number.isNaN(receiptId)) {
      res.status(400);
      throw new Error('Invalid receipt id.');
    }

    const {
      inStockOrNot, productionOrderNo, qtyTransferred, batchNumberRemarks,
      indentSelfBatchNumber, gpPercent,
    } = req.body;

    if (!inStockOrNot) {
      res.status(400);
      throw new Error('In Stock Or Not is required.');
    }
    if (inStockOrNot === 'From Purchase' && !indentSelfBatchNumber) {
      res.status(400);
      throw new Error('Indent/Self Batch Number is required for From Purchase.');
    }

    const data = {
      inStockOrNot,
      productionOrderNo: productionOrderNo || null,
      qtyTransferred: qtyTransferred ? parseFloat(qtyTransferred) : null,
      batchNumberRemarks: batchNumberRemarks || null,
      indentSelfBatchNumber: indentSelfBatchNumber || null,
      gpPercent: gpPercent || null,
    };

    const result = await prisma.$transaction(async (tx) => {
      const row = await upsertStageAndStampParent(tx, {
        model: tx.orderCheckDelivery,
        where: { receiptId },
        create: { receiptId, ...data },
        update: data,
        parentModel: tx.orderReceivedAccounts,
        parentWhere: { receiptId },
      });
      // Mirrored onto the receipt — the Invoice Report tab groups completed
      // invoices by these same source fields read straight off ORDER RECEIPT.
      await tx.orderReceipt.update({
        where: { id: receiptId },
        data: {
          inStockOrNot: data.inStockOrNot,
          orderNumberOfProduction: data.productionOrderNo,
          qtyTransferred: data.qtyTransferred,
          batchNumberInRemarks: data.batchNumberRemarks,
        },
      });
      return row;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, upsertCheckDelivery };
