const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Dispatches awaiting TC (Invoice done, TC Required = "Yes", not
//          yet moved to Delivery)
// @route   GET /api/order/tc/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const dispatches = await prisma.orderDispatch.findMany({
      where: { invoice: { isNot: null }, tcRequired: 'Yes', deliveries: { none: {} } },
      include: { receipt: true, invoice: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: dispatches });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatches (TC Required = "Yes") that already reached Delivery
//          via this stage
// @route   GET /api/order/tc/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const dispatches = await prisma.orderDispatch.findMany({
      where: { deliveries: { some: {} }, tcRequired: 'Yes' },
      include: { deliveries: true, tc: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: dispatches });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit TC for a single dispatch — records the TC file (or clears
//          it if not required), mirrors "TC Required" onto both the
//          dispatch and its parent receipt, and always creates the
//          Delivery ("Bilty root") row for this dispatch.
// @route   POST /api/order/tc
// @access  Private
const submit = async (req, res, next) => {
  try {
    const { dispatchId, tcRequired, tcFileUrl } = req.body;
    const id = parseInt(dispatchId, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid dispatch id.');
    }
    if (tcRequired !== 'Yes' && tcRequired !== 'No') {
      res.status(400);
      throw new Error('TC Required must be "Yes" or "No".');
    }
    if (tcRequired === 'Yes' && !tcFileUrl) {
      res.status(400);
      throw new Error('Test Certificate file is required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.orderDispatch.findUnique({
        where: { id },
        include: { receipt: true, logistic: true, invoice: true },
      });
      if (!dispatch) {
        const err = new Error('Dispatch not found.');
        err.statusCode = 404;
        throw err;
      }

      const tcData = { trustCertificateMade: tcRequired === 'Yes' ? tcFileUrl : '' };

      const tc = await upsertStageAndStampParent(tx, {
        model: tx.orderTc,
        where: { dispatchId: id },
        create: { dispatchId: id, ...tcData },
        update: tcData,
        parentModel: tx.orderDispatch,
        parentWhere: { id },
      });

      // The flag can be flipped Yes->No here even though it originally
      // gated this stage — mirror it onto both DISPATCH and ORDER RECEIPT
      // like the reference app does.
      await tx.orderDispatch.update({ where: { id }, data: { tcRequired } });
      if (dispatch.receiptId) {
        await tx.orderReceipt.update({ where: { id: dispatch.receiptId }, data: { tcRequired } });
      }

      // An explicit action on this page always creates the Delivery row,
      // regardless of the final Yes/No choice.
      const delivery = await tx.orderDelivery.create({
        data: {
          timestamp: new Date(),
          billDate: null,
          doNumber: dispatch.doNumber,
          partyName: dispatch.partyName,
          productName: dispatch.productName,
          quantityDelivered: dispatch.logistic?.actualTruckQty || dispatch.qtyToBeDispatched,
          billNo: dispatch.invoice?.billNumber ?? null,
          logisticNo: dispatch.dSrNumber,
          rateOfMaterial: dispatch.receipt?.rateOfMaterial ?? null,
          typeOfTransporting: dispatch.typeOfTransporting,
          transporterName: dispatch.logistic?.transporterName ?? null,
          vehicleNumber: dispatch.logistic?.truckNo ?? null,
          biltyNumber: dispatch.logistic?.biltyNo ?? null,
          givingFromWhere: '',
          dSrNumber: dispatch.dSrNumber,
          dispatchId: dispatch.id,
        },
      });

      return { tc, delivery };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
