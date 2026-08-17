const { prisma } = require('../../config/db');

// @desc    Get all payments
// @route   GET /api/refrasynth/payments
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPayment.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payments by ID
// @route   GET /api/refrasynth/payments/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPayment.findUnique({
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
  'uniqueNo',
  'partyName',
  'poNumber',
  'totalPoAmount',
  'internalCode',
  'product',
  'deliveryDate',
  'paymentTerms',
  'numberOfDays',
  'pdf',
  'payAmount',
  'file',
  'remark',
  'totalPaidAmount',
  'outstandingAmount',
  'status',
  'planned',
  'actual',
  'delay',
  'status1',
  'paymentForm',
  'paymentDone',
  'firmNameMatch',
  'poId',
  'storeInId',
  'createdAt',
  'updatedAt'
]);

const FLOAT_FIELDS = new Set([
  'totalPoAmount',
  'payAmount',
  'totalPaidAmount',
  'outstandingAmount',
  'numberOfDays'
]);

function sanitizePaymentData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      const val = body[key];
      if (FLOAT_FIELDS.has(key)) {
        if (val === null || val === undefined || val === '') {
          sanitized[key] = null;
        } else {
          const num = Number(val);
          sanitized[key] = isNaN(num) ? null : num;
        }
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
}

// @desc    Create payments
// @route   POST /api/refrasynth/payments
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPayment.create({
      data: sanitizePaymentData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payments
// @route   PATCH /api/refrasynth/payments/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPayment.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizePaymentData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payments
// @route   DELETE /api/refrasynth/payments/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthPayment.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
