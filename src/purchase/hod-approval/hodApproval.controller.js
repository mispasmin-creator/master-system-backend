const { prisma } = require('../../config/db');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// @desc    Indents awaiting HOD approval (no hodApproval row yet)
// @route   GET /api/purchase/hod-approval/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { hodApproval: null },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: indents });
  } catch (error) {
    next(error);
  }
};

// @desc    Indents with a completed HOD approval. Each row's
//          `canRevert` tells the frontend whether this indent is still at
//          the frontier of the chain (no Three Party row yet) — revert
//          must only be offered here when true, otherwise the later stage
//          has to be reverted first.
// @route   GET /api/purchase/hod-approval/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { hodApproval: { isNot: null } },
      include: { hodApproval: true, threeParty: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });
    const data = indents.map(({ threeParty, ...indent }) => ({
      ...indent,
      canRevert: !threeParty,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject an indent's HOD stage
// @route   POST /api/purchase/hod-approval/:indentId
// @access  Private
const upsertApproval = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const { approvedQty, approvalStatus, remarks } = req.body;
    if (!approvalStatus) {
      res.status(400);
      throw new Error('Approval status is required.');
    }

    const data = {
      approvedQty: approvedQty ? parseFloat(approvedQty) : null,
      approvalStatus,
      remarks: remarks?.trim() || 'ok',
    };

    const approval = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.purchaseHodApproval,
      where: { indentId },
      create: { indentId, ...data },
      update: data,
      // First time this indent reaches HOD Approval — stamp the indent's
      // updatedAt with this stage's createdAt (MIS turnaround tracking).
      parentModel: tx.purchaseIndent,
      parentWhere: { id: indentId },
    }));

    res.status(201).json({ success: true, data: approval });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo an indent's HOD Approval — deletes the hodApproval row (so
//          it reappears in Pending) and resets the indent's updatedAt back
//          to null. Refused if the indent has already moved on to Three
//          Party — that stage must be reverted first.
// @route   POST /api/purchase/hod-approval/:indentId/revert
// @access  Private
const revert = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const reverted = await prisma.$transaction((tx) => revertStage(tx, {
      model: tx.purchaseHodApproval,
      where: { indentId },
      childModel: tx.purchaseThreeParty,
      childWhere: { indentId },
      parentModel: tx.purchaseIndent,
      parentWhere: { id: indentId },
    }));

    res.json({ success: true, data: reverted });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, upsertApproval, revert };
