const { prisma } = require('../../config/db');

// @desc    Get all payment history records
// @route   GET /api/refrasynth/payment-history
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPaymentHistory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment history by ID
// @route   GET /api/refrasynth/payment-history/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPaymentHistory.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'timestamp',
  'apPaymentNumber',
  'status',
  'uniqueNumber',
  'fmsName',
  'payTo',
  'amountToBePaid',
  'remarks',
  'anyAttachments',
  'timestamp1',
  'planned',
  'paymentTerms',
  'indentNo',
  'poNumber',
  'productName',
  'liftNumber',
  'billStatus',
  'billNo',
  'qty',
  'vendorName',
  'typeOfBill',
  'billAmount',
  'discountAmount',
  'paymentType',
  'advanceAmountIfAny',
  'photoOfBill',
  'transportationInclude',
  'transporterName',
  'amount',
  'leadTimeToLiftMaterial',
  'vehicleNo',
  'driverName',
  'driverMobileNo',
  'billRemark',
  'createdAt',
  'updatedAt'
]);

function sanitizePaymentHistoryData(body) {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) {
    return body.map(sanitizePaymentHistoryData);
  }
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

// @desc    Create payment history (supports bulk or single inserts)
// @route   POST /api/refrasynth/payment-history
const create = async (req, res, next) => {
  try {
    let data;
    const sanitized = sanitizePaymentHistoryData(req.body);
    if (Array.isArray(sanitized)) {
      data = await prisma.refrasynthPaymentHistory.createMany({
        data: sanitized
      });
    } else {
      data = await prisma.refrasynthPaymentHistory.create({
        data: sanitized
      });
    }
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment history
// @route   PATCH /api/refrasynth/payment-history/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPaymentHistory.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizePaymentHistoryData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment history
// @route   DELETE /api/refrasynth/payment-history/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthPaymentHistory.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
