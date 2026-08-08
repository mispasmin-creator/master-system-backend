const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Material Return rows that are management-approved and have a
//          Debit/Credit Note issued, awaiting physical Return of Material.
// @route   GET /api/order/material-return/return-dispatch/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      where: {
        managementApproval: { managementStatus: 'Approved' },
        debitNote: { isNot: null },
        returnDispatch: null,
      },
      include: { dispatch: { include: { receipt: true } } },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Material Return rows already dispatched back.
// @route   GET /api/order/material-return/return-dispatch/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaterialReturn.findMany({
      where: { returnDispatch: { isNot: null } },
      include: { returnDispatch: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Record the physical Return of Material dispatch — terminal stage
//          of the Material Return chain.
// @route   POST /api/order/material-return/return-dispatch/:id
// @access  Private
const submit = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid id.');
    }

    const {
      hasTransporterInfo, transporterName, transporterMobile, vehicleNo, receivedDate,
      freightPaidBy, transporterType, rate, biltyNo, biltyImageUrl,
    } = req.body;

    const paidByUs = hasTransporterInfo === 'Yes' && freightPaidBy === 'Paid by Us';

    const data = {
      returnDispatchedAt: new Date(),
      hasTransporterInfo: hasTransporterInfo || 'No',
      returnTransporterName: hasTransporterInfo === 'Yes' ? transporterName : null,
      returnTransporterMobile: hasTransporterInfo === 'Yes' ? transporterMobile : null,
      returnVehicleNo: hasTransporterInfo === 'Yes' ? vehicleNo : null,
      returnFreightPaidBy: hasTransporterInfo === 'Yes' ? freightPaidBy : null,
      returnTransporterType: paidByUs ? transporterType : null,
      returnTransportRate: paidByUs && rate ? parseFloat(rate) : null,
      returnBiltyNo: paidByUs ? biltyNo || null : null,
      returnBiltyCopy: paidByUs ? biltyImageUrl || null : null,
      returnReceivedAt: receivedDate ? new Date(receivedDate) : null,
    };

    const result = await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.orderReturnDispatch,
      where: { materialReturnId: id },
      create: { materialReturnId: id, ...data },
      update: data,
      parentModel: tx.orderMaterialReturn,
      parentWhere: { id },
    }));

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
