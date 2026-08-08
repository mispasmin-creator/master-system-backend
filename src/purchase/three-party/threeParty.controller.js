const { prisma } = require('../../config/db');
const { formatVendorInput, buildThreePartyData } = require('../shared/vendorUtils');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// @desc    Indents awaiting Three Party (HOD-approved, no threeParty row yet)
// @route   GET /api/purchase/three-party/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { hodApproval: { approvalStatus: 'Approved' }, threeParty: null },
      include: { hodApproval: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: indents });
  } catch (error) {
    next(error);
  }
};

// @desc    Indents with a completed Three Party stage. `canRevert` is only
//          true when no Factory Approval row exists yet for this indent.
// @route   GET /api/purchase/three-party/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { threeParty: { isNot: null } },
      include: { threeParty: true, factoryApproval: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });
    const data = indents.map(({ factoryApproval, ...indent }) => ({
      ...indent,
      canRevert: !factoryApproval,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit up to 3 vendor quotes for an indent. If exactly one
//          vendor is filled, Factory Approval is auto-completed too
//          (Technical Tag "T1" on that vendor), matching the reference
//          system's single-vendor bypass.
// @route   POST /api/purchase/three-party/:indentId
// @access  Private
const submit = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const { vendor1, vendor2, vendor3 } = req.body;
    const vendors = [vendor1, vendor2, vendor3].map((v) => formatVendorInput(v || {}));
    const filledSlots = vendors
      .map((v, idx) => (v.name ? idx + 1 : null))
      .filter(Boolean);

    if (filledSlots.length === 0) {
      res.status(400);
      throw new Error('At least one vendor is required.');
    }

    const threePartyData = buildThreePartyData(vendors);

    const result = await prisma.$transaction(async (tx) => {
      const threeParty = await upsertStageAndStampParent(tx, {
        model: tx.purchaseThreeParty,
        where: { indentId },
        create: { indentId, ...threePartyData },
        update: threePartyData,
        // First time this indent reaches Three Party — stamp HOD Approval's
        // updatedAt with this stage's createdAt.
        parentModel: tx.purchaseHodApproval,
        parentWhere: { indentId },
      });

      let factoryApproval = null;
      if (filledSlots.length === 1) {
        const tagData = { technicalTag1: null, technicalTag2: null, technicalTag3: null };
        tagData[`technicalTag${filledSlots[0]}`] = 'T1';
        // Single-vendor bypass: Factory Approval is auto-completed in the
        // same request, so it's the next stage stamping Three Party here.
        factoryApproval = await upsertStageAndStampParent(tx, {
          model: tx.purchaseFactoryApproval,
          where: { indentId },
          create: { indentId, ...tagData },
          update: tagData,
          parentModel: tx.purchaseThreeParty,
          parentWhere: { indentId },
        });
      }

      return { threeParty, factoryApproval };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject an indent at the Three Party stage
// @route   POST /api/purchase/three-party/:indentId/reject
// @access  Private
const reject = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const data = {
      threePartyStatus: 'Rejected',
      approvedVendorName: 'Rejected',
      haveToMakePo: 'No',
    };

    const threeParty = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.purchaseThreeParty,
      where: { indentId },
      create: { indentId, ...data },
      update: data,
      parentModel: tx.purchaseHodApproval,
      parentWhere: { indentId },
    }));

    res.status(201).json({ success: true, data: threeParty });
  } catch (error) {
    next(error);
  }
};

// @desc    Post-hoc rate correction on an already-completed Three Party stage
// @route   POST /api/purchase/three-party/:indentId/update-rate
// @access  Private
const updateRate = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const { rate } = req.body;
    if (!rate || Number(rate) <= 0) {
      res.status(400);
      throw new Error('Rate must be greater than 0.');
    }

    const threeParty = await prisma.purchaseThreeParty.update({
      where: { indentId },
      data: { approvedRate: String(rate), approvedDate: new Date() },
    });

    res.json({ success: true, data: threeParty });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo an indent's Three Party stage — deletes the threeParty row
//          (so it reappears in Pending) and resets HOD Approval's updatedAt
//          back to null. Refused if Factory Approval already exists (either
//          submitted separately, or auto-created by the single-vendor
//          bypass) — that stage must be reverted first.
// @route   POST /api/purchase/three-party/:indentId/revert
// @access  Private
const revert = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const reverted = await prisma.$transaction((tx) => revertStage(tx, {
      model: tx.purchaseThreeParty,
      where: { indentId },
      childModel: tx.purchaseFactoryApproval,
      childWhere: { indentId },
      parentModel: tx.purchaseHodApproval,
      parentWhere: { indentId },
    }));

    res.json({ success: true, data: reverted });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, submit, reject, updateRate, revert };
