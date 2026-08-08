const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Management-approved Material Return rows awaiting Debit/Credit
//          Note issuance.
// @route   GET /api/order/material-return/debit-note/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      where: { managementApproval: { managementStatus: 'Approved' }, debitNote: null },
      include: { dispatch: { include: { receipt: true, invoice: true } } },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Material Return rows with a Debit/Credit Note already issued.
// @route   GET /api/order/material-return/debit-note/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      where: { debitNote: { isNot: null } },
      include: { debitNote: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue a Debit/Credit Note for a Material Return line. The
//          reference UI only ever issues type "Credit Note" regardless of
//          the suggested-reason logic (a frontend-only convenience calc),
//          so this always writes debitNote: 'Credit Note', matching current
//          reference behavior.
// @route   POST /api/order/material-return/debit-note/:id
// @access  Private
const issue = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid id.');
    }

    const { noteNumber, amount, fileUrl } = req.body;
    if (!noteNumber) {
      res.status(400);
      throw new Error('Note Number is required.');
    }
    if (amount === undefined || amount === null || amount === '') {
      res.status(400);
      throw new Error('Amount is required.');
    }

    const data = {
      debitNote: 'Credit Note',
      debitNoteNumber: noteNumber,
      debitNoteAmount: parseFloat(amount),
      debitNoteIssuedAt: new Date(),
    };

    const result = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.orderReturnDebitNote,
      where: { materialReturnId: id },
      create: { materialReturnId: id, ...data, debitNoteCopy: fileUrl || null },
      update: { ...data, debitNoteCopy: fileUrl || undefined },
      parentModel: tx.orderMaterialReturn,
      parentWhere: { id },
    }));

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, issue };
