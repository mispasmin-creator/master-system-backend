const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Dispatches awaiting Fullkitting (Invoice done, no fullkitting row
//          yet, AND either Ex-Factory transport or a Bilty already on file
//          for one of its Delivery rows)
// @route   GET /api/order/fullkitting/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const dispatches = await prisma.orderDispatch.findMany({
      where: { invoice: { isNot: null }, fullkitting: null },
      include: {
        invoice: true,
        receipt: true,
        deliveries: { include: { bilty: true } },
      },
      orderBy: { id: 'asc' },
    });

    // Ready-to-appear gate: for Ex-Factory transport types, just having a
    // matching Delivery row is enough; for everything else, that Delivery
    // row's Bilty must already be on file (i.e. UnifiedLogistics done).
    const data = dispatches.filter((d) => {
      const isExFactory = (d.typeOfTransporting || '').toLowerCase().includes('ex factory');
      if (isExFactory) return d.deliveries.length > 0;
      return d.deliveries.some((delivery) => delivery.bilty);
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatches with a completed Fullkitting stage
// @route   GET /api/order/fullkitting/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const dispatches = await prisma.orderDispatch.findMany({
      where: { fullkitting: { isNot: null } },
      include: { fullkitting: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: dispatches });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Fullkitting for a single dispatch (transporter billing).
//          Status "No" skips the transporter-billing fields entirely.
//          Status "Yes" with a Bilty No. also syncs that Bilty No. onto the
//          dispatch's Delivery row(s) (mirrors the reference app's
//          cross-write from FullkittingPage onto DELIVERY."Bilty No.").
// @route   POST /api/order/fullkitting
// @access  Private
const submit = async (req, res, next) => {
  try {
    const {
      dispatchId,
      status,
      productName,
      actualTruckQty,
      transporterName,
      truckNo,
      rateType,
      transporterRate,
      totalTransporterAmount,
      biltyNo,
      remarks,
      transporterBillImage,
    } = req.body;

    const id = parseInt(dispatchId, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid dispatch id.');
    }
    if (status !== 'Yes' && status !== 'No') {
      res.status(400);
      throw new Error('Status must be "Yes" or "No".');
    }

    let payload;
    if (status === 'Yes') {
      if (!productName || !actualTruckQty || !transporterName || !truckNo) {
        res.status(400);
        throw new Error('Product Name, Actual Truck Qty, Transporter Name and Truck No. are required.');
      }
      const isExFactory = rateType === 'Ex Factory Transporter';
      payload = {
        fullkittingStatus: 'Yes',
        productName,
        actualTruckQty: parseFloat(actualTruckQty),
        transporterName,
        truckNo,
        fullkittingAmount: isExFactory ? 0 : (parseFloat(transporterRate) || null),
        totalTransporterAmount: (rateType === 'Per MT' || rateType === 'Fixed')
          ? (parseFloat(totalTransporterAmount) || null)
          : (isExFactory ? 0 : null),
        fullkittingRemarks: remarks || null,
        biltyNo: biltyNo || null,
        transporterBillImage: transporterBillImage || null,
      };
    } else {
      payload = { fullkittingStatus: 'No' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const row = await upsertStageAndStampParent(tx, {
        model: tx.orderFullkitting,
        where: { dispatchId: id },
        create: { dispatchId: id, ...payload },
        update: payload,
        parentModel: tx.orderDispatch,
        parentWhere: { id },
      });

      // Sync the Bilty No. onto every Delivery row for this dispatch — only
      // touches biltyNo, leaves an existing biltyCopy untouched.
      if (status === 'Yes' && biltyNo) {
        const deliveries = await tx.orderDelivery.findMany({ where: { dispatchId: id } });
        for (const delivery of deliveries) {
          await tx.orderBilty.upsert({
            where: { deliveryId: delivery.id },
            create: { deliveryId: delivery.id, biltyNo },
            update: { biltyNo },
          });
        }
      }

      return row;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
