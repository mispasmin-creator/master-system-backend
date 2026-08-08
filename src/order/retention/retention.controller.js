const { prisma } = require('../../config/db');

// @desc    Order receipts flagged for retention + existing retention records +
//          material receipts (for computing per-DO bill amounts) — frontend
//          computes billAmount/retentionAmount/dueDate/balance/status per PO group
// @route   GET /api/order/retention
// @access  Public
const listGroups = async (req, res, next) => {
  try {
    const receipts = await prisma.orderReceipt.findMany({
      where: { retentionPayment: 'Yes' },
      orderBy: { id: 'desc' },
    });
    const retentionRecords = await prisma.orderRetentionRecord.findMany();
    const materialReceipts = await prisma.orderMaterialReceipt.findMany({
      select: { orderNo: true, totalBillAmount: true, billDate: true },
    });
    res.json({ success: true, data: { receipts, retentionRecords, materialReceipts } });
  } catch (error) {
    next(error);
  }
};

// @desc    Upsert a retention record for a PO (mark as fully paid, or record a
//          new cumulative amount received after a partial payment)
// @route   POST /api/order/retention
// @access  Private
const upsertRetention = async (req, res, next) => {
  try {
    const { poNumber, amountReceived, markAsPaid, retentionAmount, remarks } = req.body;

    if (!poNumber || retentionAmount === undefined || retentionAmount === null) {
      res.status(400);
      throw new Error('poNumber and retentionAmount are required.');
    }

    const newAmount = markAsPaid ? parseFloat(retentionAmount) : parseFloat(amountReceived);
    if (Number.isNaN(newAmount)) {
      res.status(400);
      throw new Error('amountReceived is required unless markAsPaid is true.');
    }

    const status = newAmount >= parseFloat(retentionAmount) ? 'Paid' : (newAmount > 0 ? 'Partial' : 'Pending');

    const row = await prisma.orderRetentionRecord.upsert({
      where: { poNumber },
      create: { poNumber, amountReceived: newAmount, status, remarks: remarks || null },
      update: { amountReceived: newAmount, status, remarks: remarks || undefined, updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

module.exports = { listGroups, upsertRetention };
