const { prisma } = require('../../config/db');
const { nextSequenceNumbers } = require('../shared/sequence');

const VALID_REASONS = [
  'Damage Done',
  'Quality Issue',
  'Material Shortage',
  'Wrong Product',
  'Material Return',
  'Other',
];

// @desc    Look up OrderDispatch rows by invoice (Bill Number), with the
//          already-returned qty subtracted, for the Material Return intake
//          form's "look up invoice" action.
// @route   GET /api/order/material-return/lookup?billNumber=...&firmName=...
// @access  Public
const lookupInvoice = async (req, res, next) => {
  try {
    const { billNumber, firmName } = req.query;
    if (!billNumber) {
      res.status(400);
      throw new Error('billNumber is required.');
    }

    const dispatches = await prisma.orderDispatch.findMany({
      where: { invoice: { billNumber } },
      include: { receipt: true, invoice: true },
      orderBy: { id: 'desc' },
    });

    const scoped = dispatches.filter((d) => !firmName || d.receipt?.firmName === firmName);

    const dispatchIds = scoped.map((d) => d.id);
    const returnedSums = dispatchIds.length
      ? await prisma.orderMaterialReturn.groupBy({
          by: ['dispatchId'],
          where: { dispatchId: { in: dispatchIds } },
          _sum: { qty: true },
        })
      : [];
    const returnedByDispatch = new Map(returnedSums.map((r) => [r.dispatchId, r._sum.qty || 0]));

    const data = scoped
      .map((d) => {
        const alreadyReturned = returnedByDispatch.get(d.id) || 0;
        const availableQty = (d.qtyToBeDispatched || 0) - alreadyReturned;
        return { ...d, alreadyReturned, availableQty };
      })
      .filter((d) => d.availableQty > 0);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit one or more Material Return lines ("Return From Party" intake).
// @route   POST /api/order/material-return
// @access  Private
const createReturn = async (req, res, next) => {
  try {
    const { lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      res.status(400);
      throw new Error('At least one return line is required.');
    }

    for (const line of lines) {
      const qty = parseFloat(line.returnQty);
      if (!qty || qty <= 0) {
        res.status(400);
        throw new Error('Each line requires a Return Qty greater than 0.');
      }
      if (!line.reason || !VALID_REASONS.includes(line.reason)) {
        res.status(400);
        throw new Error('Each line requires a valid Reason.');
      }
      if (!line.debitNoteCopy) {
        res.status(400);
        throw new Error('Each line requires a Debit Note Copy upload.');
      }
    }

    const rows = await prisma.$transaction(async (tx) => {
      const returnNumbers = await nextSequenceNumbers(tx, {
        lockKey: 'order_material_return_number',
        tableName: 'order_materialReturn',
        column: 'Return No.',
        regex: /^(\d+)$/,
        prefix: '',
        pad: 4,
        count: lines.length,
      });

      const created = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const row = await tx.orderMaterialReturn.create({
          data: {
            timeStamp: new Date(),
            doNumber: line.doNumber,
            partyName: line.partyName,
            productName: line.productName,
            qty: parseFloat(line.returnQty),
            reasonOfReturn: line.reason,
            transportPayment: null,
            returnNo: returnNumbers[i],
            debitNoteCopy: line.debitNoteCopy,
            dispatchId: line.dispatchId ? parseInt(line.dispatchId, 10) : null,
          },
        });
        created.push(row);
      }
      return created;
    });

    res.status(201).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Flat list of every Material Return row, with all downstream
//          sub-stage relations included, for client-side filtering.
// @route   GET /api/order/material-return
// @access  Public
const listAll = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      orderBy: { id: 'desc' },
      include: {
        dispatch: { include: { receipt: true, invoice: true } },
        managementApproval: true,
        debitNote: true,
        returnDispatch: true,
      },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { lookupInvoice, createReturn, listAll };
