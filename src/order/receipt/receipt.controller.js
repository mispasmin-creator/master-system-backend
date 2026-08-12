const { prisma } = require('../../config/db');
const { nextSequenceNumber } = require('../shared/sequence');

const parseNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const parseIntSafe = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

// @desc    List all order receipts (Order page — firm-scoping is applied
//          client-side, matching the purchase module's convention)
// @route   GET /api/order/receipt
// @access  Public
const listReceipts = async (req, res, next) => {
  try {
    const rows = await prisma.orderReceipt.findMany({
      orderBy: { id: 'desc' },
      include: { checkPo: true, receivedAccounts: true, checkDelivery: true },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new order — one ORDER RECEIPT row per product line,
//          sharing one atomically-generated DO number.
// @route   POST /api/order/receipt
// @access  Private
const createReceipt = async (req, res, next) => {
  try {
    const {
      firmName, partyName, address, gstNumber, customerCategory, typeOfPi, marketingSalesPerson,
      partyPoNo, partyPoDate, contactPersonName, contactPersonWhatsapp,
      orderReceivedFrom, isOrderThroughAgent, typeOfMeasurement,
      leadTimeForCollectionOfFinalPayment, typeOfApplication, freeReplacementFoc,
      paymentToBeTaken, retentionPayment, retentionPercentage, leadTimeForRetention,
      specificConcern, referenceNo, marketingManagerName, typeOfPackaging, tcRequired,
      typeOfTransporting, leadTimeToReachFactory, uploadSo, adjustedAmount,
      products,
    } = req.body;

    if (!firmName || !partyPoNo || !partyName || !contactPersonName || !contactPersonWhatsapp) {
      res.status(400);
      throw new Error('Firm Name, PO No, Party Name, Contact Person and WhatsApp No. are required.');
    }
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400);
      throw new Error('At least one product line is required.');
    }

    const uploadSoUrl = uploadSo || 'N/A';
    const freight = typeOfTransporting === 'Ex Factory But paid by Us' ? 'Yes' : 'No';

    // PI Due Date auto-calc: only when Type Of PI implies "100% after ..."
    let piDueDate = null;
    const piTypeLower = String(typeOfPi || '').toLowerCase();
    if (piTypeLower.includes('100') && piTypeLower.includes('after')) {
      const days = (parseNum(leadTimeForCollectionOfFinalPayment) || 0) + (parseNum(leadTimeToReachFactory) || 0);
      piDueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const rows = await prisma.$transaction(async (tx) => {
      const doNumber = await nextSequenceNumber(tx, {
        lockKey: 'order_do_number',
        tableName: 'order_receipt',
        column: 'DO-Delivery Order No.',
        regex: /^DO-(\d+)$/,
        prefix: 'DO-',
      });

      const now = new Date();
      const created = [];
      for (const p of products) {
        const quantity = parseNum(p.quantity) || 0;
        const rateOfMaterial = parseNum(p.rateOfMaterial) || 0;
        const advance = parseNum(p.advance) ?? 100;
        const basic = 100 - advance;

        const row = await tx.orderReceipt.create({
          data: {
            timestamp: now,
            doNumber,
            partyPoNo,
            partyPoDate: partyPoDate ? new Date(partyPoDate) : null,
            partyName,
            productName: p.productName,
            quantity,
            rateOfMaterial,
            typeOfTransporting,
            uploadSo: uploadSoUrl,
            isOrderThroughAgent: isOrderThroughAgent || null,
            orderReceivedFrom: orderReceivedFrom || null,
            typeOfMeasurement: typeOfMeasurement || null,
            contactPersonName,
            contactPersonWhatsapp,
            aluminaPercent: parseNum(p.aluminaPercent),
            ironPercent: parseNum(p.ironPercent),
            typeOfPi: typeOfPi || null,
            leadTimeForCollectionOfFinalPayment: leadTimeForCollectionOfFinalPayment || null,
            typeOfApplication: typeOfApplication || null,
            customerCategory: customerCategory || null,
            freeReplacementFoc: freeReplacementFoc || null,
            gstNumber: gstNumber || null,
            address: address || null,
            firmName,
            totalPoBasicValue: quantity * rateOfMaterial,
            paymentToBeTaken: paymentToBeTaken || null,
            advance,
            basic,
            retentionPayment: retentionPayment || 'No',
            retentionPercentage: parseNum(retentionPercentage),
            leadTimeForRetention: parseIntSafe(leadTimeForRetention),
            specificConcern: specificConcern || null,
            referenceNo: referenceNo || null,
            adjustedAmount: parseNum(adjustedAmount),
            marketingManagerName: marketingSalesPerson || marketingManagerName || null,
            delivered: 0,
            pendingQty: quantity,
            status: 'New Order',
            typeOfPackaging: typeOfPackaging || null,
            tcRequired: tcRequired || null,
            freight,
            freightAmount: freight === 'Yes' ? parseNum(p.freightAmount) : null,
            leadTimeToReachFactory: parseIntSafe(leadTimeToReachFactory),
            piDueDate,
          },
        });
        created.push(row);
      }
      return created;
    });

    res.status(201).json({ success: true, data: { doNumber: rows[0]?.doNumber || null, rows } });
  } catch (error) {
    next(error);
  }
};

// @desc    Replace the "Upload SO" file for every row sharing a PO number
//          (or a single row when there is no PO number) — the Order list's
//          detail-modal "replace file" action.
// @route   PATCH /api/order/receipt/upload-so
// @access  Private
const updateUploadSo = async (req, res, next) => {
  try {
    const { partyPoNo, firmName, uploadSo, rowId } = req.body;
    if (!uploadSo) {
      res.status(400);
      throw new Error('uploadSo URL is required.');
    }

    if (!partyPoNo || partyPoNo === 'No PO') {
      if (!rowId) {
        res.status(400);
        throw new Error('rowId is required when there is no PO number.');
      }
      const row = await prisma.orderReceipt.update({
        where: { id: parseInt(rowId, 10) },
        data: { uploadSo },
      });
      return res.json({ success: true, data: [row] });
    }

    const result = await prisma.orderReceipt.updateMany({
      where: { partyPoNo, firmName: firmName || undefined },
      data: { uploadSo },
    });
    res.json({ success: true, data: { count: result.count } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listReceipts, createReceipt, updateUploadSo };
