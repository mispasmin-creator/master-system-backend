const { prisma } = require('../../config/db');
const { getVendorsFromThreeParty, buildTechnicalTagUpdate } = require('../shared/vendorUtils');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// @desc    Indents awaiting Factory Approval (Three Party done, no
//          factoryApproval row yet — single-vendor auto-bypasses skip this)
// @route   GET /api/purchase/factory-approval/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: {
        threeParty: { threePartyStatus: 'Approved' },
        factoryApproval: null,
      },
      include: { threeParty: true },
      orderBy: { id: 'asc' },
    });

    const data = indents.map((indent) => ({
      ...indent,
      vendors: getVendorsFromThreeParty(indent.threeParty, null),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Indents with a completed Factory Approval stage. `canRevert` is
//          only true when no Management Approval row exists yet.
// @route   GET /api/purchase/factory-approval/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { factoryApproval: { isNot: null } },
      include: { threeParty: true, factoryApproval: true, managementApproval: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });

    const data = indents.map(({ managementApproval, ...indent }) => ({
      ...indent,
      vendors: getVendorsFromThreeParty(indent.threeParty, indent.factoryApproval),
      canRevert: !managementApproval,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign each vendor a technical tag (T1/T2/T3)
// @route   POST /api/purchase/factory-approval/:indentId
// @access  Private
const submit = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const { technicalAssignments } = req.body;
    if (!technicalAssignments) {
      res.status(400);
      throw new Error('technicalAssignments is required.');
    }

    const threeParty = await prisma.purchaseThreeParty.findUnique({ where: { indentId } });
    if (!threeParty) {
      res.status(400);
      throw new Error('This indent has not completed Three Party yet.');
    }

    const vendors = getVendorsFromThreeParty(threeParty, null);
    const assignedCount = Object.values(technicalAssignments).filter(Boolean).length;
    if (assignedCount !== vendors.length) {
      res.status(400);
      throw new Error('Every vendor must be assigned a technical bucket.');
    }

    const tagData = buildTechnicalTagUpdate(technicalAssignments);
    const factoryApproval = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.purchaseFactoryApproval,
      where: { indentId },
      create: { indentId, ...tagData },
      update: tagData,
      parentModel: tx.purchaseThreeParty,
      parentWhere: { indentId },
    }));

    res.status(201).json({ success: true, data: factoryApproval });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo an indent's Factory Approval stage — deletes the
//          factoryApproval row (so it reappears in Pending) and resets
//          Three Party's updatedAt back to null. Refused if Management
//          Approval already exists — that stage must be reverted first.
// @route   POST /api/purchase/factory-approval/:indentId/revert
// @access  Private
const revert = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const reverted = await prisma.$transaction((tx) => revertStage(tx, {
      model: tx.purchaseFactoryApproval,
      where: { indentId },
      childModel: tx.purchaseManagementApproval,
      childWhere: { indentId },
      parentModel: tx.purchaseThreeParty,
      parentWhere: { indentId },
    }));

    res.json({ success: true, data: reverted });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, submit, revert };
