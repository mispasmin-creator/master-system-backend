const { prisma } = require('../../config/db');
const {
  getVendorsFromThreeParty,
  compareTechnicalTags,
  buildApprovedVendorUpdate,
} = require('../shared/vendorUtils');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// @desc    Indents awaiting Management Approval (Factory done, no
//          managementApproval row yet)
// @route   GET /api/purchase/management-approval/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { factoryApproval: { isNot: null }, managementApproval: null },
      include: { threeParty: true, factoryApproval: true },
      orderBy: { id: 'asc' },
    });

    const data = indents
      .map((indent) => ({
        ...indent,
        vendors: getVendorsFromThreeParty(indent.threeParty, indent.factoryApproval)
          .filter((v) => v.technicalTag)
          .sort(compareTechnicalTags),
      }))
      .filter((indent) => indent.vendors.length > 0);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Indents with a completed Management Approval stage. `canRevert`
//          is only true when no Generate PO row exists yet (that stage
//          isn't wired to a controller yet, so this is always true today —
//          kept for forward-compatibility once it is built).
// @route   GET /api/purchase/management-approval/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: { managementApproval: { isNot: null } },
      include: {
        managementApproval: true,
        threeParty: true,
        factoryApproval: true,
        generatePo: { select: { id: true } },
      },
      orderBy: { id: 'asc' },
    });

    const data = indents.map(({ generatePo, ...indent }) => {
      const vendors = getVendorsFromThreeParty(indent.threeParty, indent.factoryApproval);
      const approvedVendor = vendors.find(
        (v) => v.name === (indent.managementApproval.approvedVendorName || ''),
      );
      return { ...indent, approvedTag: approvedVendor?.technicalTag || '', canRevert: !generatePo };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve one vendor as the final chosen vendor for this indent
// @route   POST /api/purchase/management-approval/:indentId/approve
// @access  Private
const approve = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const { vendorSlot } = req.body;
    const threeParty = await prisma.purchaseThreeParty.findUnique({ where: { indentId } });
    const factoryApproval = await prisma.purchaseFactoryApproval.findUnique({ where: { indentId } });
    if (!threeParty || !factoryApproval) {
      res.status(400);
      throw new Error('This indent has not completed Factory Approval yet.');
    }

    const vendor = getVendorsFromThreeParty(threeParty, factoryApproval).find(
      (v) => v.slot === Number(vendorSlot),
    );
    if (!vendor) {
      res.status(400);
      throw new Error('Please select one vendor.');
    }

    const data = {
      ...buildApprovedVendorUpdate(vendor),
      approvedDate: new Date(),
      haveToMakePo: 'Yes',
    };

    const managementApproval = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.purchaseManagementApproval,
      where: { indentId },
      create: { indentId, ...data },
      update: data,
      parentModel: tx.purchaseFactoryApproval,
      parentWhere: { indentId },
    }));

    res.status(201).json({ success: true, data: managementApproval });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject an indent at the Management Approval stage
// @route   POST /api/purchase/management-approval/:indentId/reject
// @access  Private
const reject = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const data = {
      approvedDate: new Date(),
      approvedVendorName: 'Rejected',
      haveToMakePo: 'No',
    };

    const managementApproval = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.purchaseManagementApproval,
      where: { indentId },
      create: { indentId, ...data },
      update: data,
      parentModel: tx.purchaseFactoryApproval,
      parentWhere: { indentId },
    }));

    res.status(201).json({ success: true, data: managementApproval });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo an indent's Management Approval — deletes the
//          managementApproval row (so it reappears in Pending) and resets
//          Factory Approval's updatedAt back to null. Refused if Generate
//          PO already exists for this indent.
// @route   POST /api/purchase/management-approval/:indentId/revert
// @access  Private
const revert = async (req, res, next) => {
  try {
    const indentId = parseInt(req.params.indentId, 10);
    if (Number.isNaN(indentId)) {
      res.status(400);
      throw new Error('Invalid indent id.');
    }

    const reverted = await prisma.$transaction((tx) => revertStage(tx, {
      model: tx.purchaseManagementApproval,
      where: { indentId },
      childModel: tx.purchaseGeneratePo,
      childWhere: { indentId },
      parentModel: tx.purchaseFactoryApproval,
      parentWhere: { indentId },
    }));

    res.json({ success: true, data: reverted });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, approve, reject, revert };
