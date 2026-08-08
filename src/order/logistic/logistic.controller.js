const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');
const { nextSequenceNumbers } = require('../shared/sequence');

const TRANSPORTER_TYPES = ['FOR', 'Ex Factory', 'Ex Factory But paid by Us', 'Owned Truck', 'Direct Supply'];
const DETAIL_TYPES = ['FOR', 'Ex Factory But paid by Us'];

// @desc    Dispatches awaiting Logistic (no logistic row yet)
// @route   GET /api/order/logistic/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { logistic: null },
      include: { receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatches with a completed Logistic stage
// @route   GET /api/order/logistic/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { logistic: { isNot: null } },
      include: { logistic: true, receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit transporter/vehicle details for a batch of dispatches —
//          allocates one LGST-Sr number per dispatch and, when the dispatch
//          originated from a logistics split, flips that split to
//          'Logistic Completed'.
// @route   POST /api/order/logistic/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const {
      dispatchIds,
      transporterType,
      transporterName,
      truckNo,
      driverMobileNo,
      vehicleNoPlateImage,
      biltyNo,
      typeOfRate,
      rate,
    } = req.body;

    if (!Array.isArray(dispatchIds) || dispatchIds.length === 0) {
      res.status(400);
      throw new Error('dispatchIds is required.');
    }
    if (!TRANSPORTER_TYPES.includes(transporterType)) {
      res.status(400);
      throw new Error(`transporterType must be one of ${TRANSPORTER_TYPES.join(', ')}.`);
    }

    const showDetails = DETAIL_TYPES.includes(transporterType);
    if (showDetails && (!transporterName || !truckNo || !driverMobileNo)) {
      res.status(400);
      throw new Error('Transporter Name, Truck No. and Driver Mobile No. are required for this transporter type.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const lgstNumbers = await nextSequenceNumbers(tx, {
        lockKey: 'order_logistic_lgst_number',
        tableName: 'order_logistic',
        column: 'LGST-Sr Number',
        regex: /LGST-(\d+)/i,
        prefix: 'LGST-',
        pad: 3,
        count: dispatchIds.length,
      });

      const created = [];

      for (let i = 0; i < dispatchIds.length; i++) {
        const dispatchId = parseInt(dispatchIds[i], 10);
        if (Number.isNaN(dispatchId)) continue;

        const dispatch = await tx.orderDispatch.findUnique({ where: { id: dispatchId } });
        if (!dispatch) continue;

        const data = {
          lgstSrNumber: lgstNumbers[i],
          confirmedTypeOfTransporting: transporterType,
          transporterName: showDetails ? transporterName : null,
          truckNo: showDetails ? truckNo : null,
          driverMobileNo: showDetails ? driverMobileNo : null,
          vehicleNoPlateImage: vehicleNoPlateImage || null,
          biltyNo: showDetails ? biltyNo : null,
          typeOfRate: showDetails ? typeOfRate : null,
          transportRatePerMt:
            showDetails && typeOfRate === 'Per Matric Ton rate'
              ? parseFloat(rate)
              : typeOfRate === 'Ex Factory Transporter'
                ? 0
                : null,
          fixedAmount:
            showDetails && typeOfRate === 'Fixed Amount'
              ? parseFloat(rate)
              : typeOfRate === 'Ex Factory Transporter'
                ? 0
                : null,
          actualTruckQty: dispatch.qtyToBeDispatched,
        };

        const logisticRow = await upsertStageAndStampParent(tx, {
          model: tx.orderLogistic,
          where: { dispatchId },
          create: { dispatchId, ...data },
          update: data,
          parentModel: tx.orderDispatch,
          parentWhere: { id: dispatchId },
        });

        if (dispatch.logisticsSplitId) {
          await tx.orderLogisticsSplit.update({
            where: { id: dispatch.logisticsSplitId },
            data: { status: 'Logistic Completed', lgstSrNumber: lgstNumbers[i] },
          });
        }

        created.push(logisticRow);
      }

      return created;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
