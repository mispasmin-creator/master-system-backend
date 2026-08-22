const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// @desc    Dispatches awaiting Invoice (Wetman Entry done, no invoice row yet)
// @route   GET /api/order/invoice/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { wetmanEntry: { isNot: null }, invoice: null },
      include: { receipt: true, logistic: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatches with a completed Invoice stage
// @route   GET /api/order/invoice/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { invoice: { isNot: null } },
      include: { invoice: true, receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Flat report of all invoiced dispatches, including the
//          check-delivery source (In Stock / From Purchase / For Production
//          Planning) — grouping by source is a pure frontend concern.
// @route   GET /api/order/invoice/report
// @access  Public
const listReport = async (req, res, next) => {
  try {
    const rows = await prisma.orderDispatch.findMany({
      where: { invoice: { isNot: null } },
      include: { receipt: { include: { checkDelivery: true } }, invoice: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit invoice details for a batch of dispatches. When a
//          dispatch's receipt does not require a Test Certificate
//          ("TC Required" === 'No'), also creates the OrderDelivery row
//          here — this is the TC-bypass branch; otherwise the (separately
//          built) TC-stage controller creates OrderDelivery later.
// @route   POST /api/order/invoice/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const { dispatchIds, invoiceNo, invoiceDate, invoiceCopy, ratesByDispatchId } = req.body;

    if (!Array.isArray(dispatchIds) || dispatchIds.length === 0) {
      res.status(400);
      throw new Error('dispatchIds is required.');
    }
    if (!invoiceNo) {
      res.status(400);
      throw new Error('Invoice No. is required.');
    }
    if (!invoiceDate) {
      res.status(400);
      throw new Error('Invoice Date is required.');
    }
    if (!invoiceCopy) {
      res.status(400);
      throw new Error('Invoice Copy is required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const rawDispatchId of dispatchIds) {
        const dispatchId = parseInt(rawDispatchId, 10);
        if (Number.isNaN(dispatchId)) continue;

        const dispatch = await tx.orderDispatch.findUnique({
          where: { id: dispatchId },
          include: { receipt: true, logistic: true },
        });
        if (!dispatch) continue;

        const billCopyStr = typeof invoiceCopy === 'object' && invoiceCopy?.url
          ? invoiceCopy.url
          : String(invoiceCopy || '');

        const data = {
          billNumber: String(invoiceNo),
          billDate: new Date(invoiceDate),
          billCopy: billCopyStr,
        };

        const invoiceRow = await upsertStageAndStampParent(tx, {
          model: tx.orderInvoice,
          where: { dispatchId },
          create: { dispatchId, ...data },
          update: data,
          parentModel: tx.orderWetmanEntry,
          parentWhere: { dispatchId },
        });

        if (dispatch.tcRequired === 'No') {
          await tx.orderDelivery.create({
            data: {
              timestamp: new Date(),
              billDate: new Date(invoiceDate),
              doNumber: dispatch.doNumber,
              partyName: dispatch.partyName,
              productName: dispatch.productName,
              quantityDelivered: dispatch.logistic?.actualTruckQty || dispatch.qtyToBeDispatched,
              billNo: invoiceNo,
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
        }

        created.push(invoiceRow);
      }

      return created;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, listReport, submit };
