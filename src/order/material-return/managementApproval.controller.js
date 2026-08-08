const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Material Return rows awaiting Management Approval (gate: row
//          exists at all — "Time Stamp" is always set at intake — and no
//          managementApproval row yet).
// @route   GET /api/order/material-return/management-approval/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      where: { managementApproval: null },
      include: { dispatch: { include: { receipt: true } } },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Material Return rows with a Management Approval decision made
//          (Approved or Rejected).
// @route   GET /api/order/material-return/management-approval/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      where: { managementApproval: { isNot: null } },
      include: { managementApproval: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a Material Return line.
// @route   POST /api/order/material-return/management-approval/:id/approve
// @access  Private
const approve = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid id.');
    }

    const { remarks } = req.body;

    const result = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.orderReturnManagementApproval,
      where: { materialReturnId: id },
      create: { materialReturnId: id, managementStatus: 'Approved', managementRemarks: remarks || null },
      update: { managementStatus: 'Approved', managementRemarks: remarks || null },
      parentModel: tx.orderMaterialReturn,
      parentWhere: { id },
    }));

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a Material Return line (remarks mandatory).
// @route   POST /api/order/material-return/management-approval/:id/reject
// @access  Private
const reject = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid id.');
    }

    const { remarks } = req.body;
    if (!remarks) {
      res.status(400);
      throw new Error('Remarks are required to reject.');
    }

    const result = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.orderReturnManagementApproval,
      where: { materialReturnId: id },
      create: { materialReturnId: id, managementStatus: 'Rejected', managementRemarks: remarks },
      update: { managementStatus: 'Rejected', managementRemarks: remarks },
      parentModel: tx.orderMaterialReturn,
      parentWhere: { id },
    }));

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, approve, reject };
