const { prisma } = require('../../config/db');

// @desc    Order receipts ready to have logistics arranged (accounts-cleared
//          + check-delivery done) and still awaiting arrangement.
// @route   GET /api/order/arrange-logistics/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: {
        receivedAccounts: { isNot: null },
        checkDelivery: { isNot: null },
        OR: [{ logisticsStatus: null }, { logisticsStatus: 'Pending Arrangement' }],
      },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Order receipts that already have logistics arranged (any status
//          other than null/Pending Arrangement), with their splits.
// @route   GET /api/order/arrange-logistics/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      where: {
        receivedAccounts: { isNot: null },
        checkDelivery: { isNot: null },
        logisticsStatus: { notIn: ['Pending Arrangement'] },
        NOT: { logisticsStatus: null },
      },
      orderBy: { id: 'asc' },
    });
    const receiptIds = rows.map((r) => r.id);
    const splits = await prisma.orderLogisticsSplit.findMany({
      where: { receiptId: { in: receiptIds } },
      orderBy: { sortOrder: 'asc' },
    });
    const splitsByReceipt = splits.reduce((acc, s) => {
      (acc[s.receiptId] = acc[s.receiptId] || []).push(s);
      return acc;
    }, {});
    const data = rows.map((r) => ({ ...r, splits: splitsByReceipt[r.id] || [] }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Arrange logistics for a PO group: create one plan + a split per
//          (selected product row × transporter option). Only the first
//          option gets the remaining qty pre-allocated; the rest are
//          placeholders (allocated_qty=0) for Logistics Approval to
//          redistribute.
// @route   POST /api/order/arrange-logistics/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const { receiptIds, transporterOptions, createdBy } = req.body;

    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      res.status(400);
      throw new Error('Select at least one product row.');
    }
    if (!Array.isArray(transporterOptions) || transporterOptions.length === 0) {
      res.status(400);
      throw new Error('At least one transporter option is required.');
    }
    if (transporterOptions.length > 10) {
      res.status(400);
      throw new Error('A maximum of 10 transporter options is allowed.');
    }
    for (const opt of transporterOptions) {
      const isExFactory = String(opt.transporterName || '').trim() === 'Ex Factory Transporter';
      if (!opt.transporterName || (!isExFactory && (opt.rate === undefined || opt.rate === null || opt.rate === ''))) {
        res.status(400);
        throw new Error('Transporter name and rate are required for every option (unless "Ex Factory Transporter").');
      }
    }

    const ids = receiptIds.map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v));

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.orderLogisticsPlan.create({
        data: { receiptId: ids[0], mode: transporterOptions.length > 1 ? 'split' : 'single', status: 'Pending Approval', createdBy: createdBy || null },
      });

      const splits = [];
      for (let productIdx = 0; productIdx < ids.length; productIdx++) {
        const receiptId = ids[productIdx];
        const receipt = await tx.orderReceipt.findUnique({ where: { id: receiptId } });
        if (!receipt) continue;
        const remainingQty = Math.max(0, (receipt.quantity || 0) - (receipt.logisticsApprovedQty || 0));

        for (let optionIdx = 0; optionIdx < transporterOptions.length; optionIdx++) {
          const opt = transporterOptions[optionIdx];
          const split = await tx.orderLogisticsSplit.create({
            data: {
              planId: plan.id,
              receiptId,
              transporterName: opt.transporterName,
              contactNumber: opt.contactNumber || null,
              rate: opt.rate !== undefined && opt.rate !== '' ? parseFloat(opt.rate) : 0,
              vehicleDetails: opt.rateType || null,
              allocatedQty: optionIdx === 0 ? remainingQty : 0,
              status: 'Pending Approval',
              sortOrder: productIdx * 10 + optionIdx,
            },
          });
          splits.push(split);
        }

        await tx.orderReceipt.update({
          where: { id: receiptId },
          data: { logisticsStatus: 'Pending Approval', approvedLogisticsPlanId: null },
        });
      }

      return { plan, splits };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
