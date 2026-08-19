const { prisma } = require('../../config/db');

// @desc    Get all payment
// @route   GET /api/store/payment
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storePayment.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment by ID
// @route   GET /api/store/payment/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storePayment.findUnique({
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
  'paymentForm',
  'paymentDone',
  'firmNameMatch',
  'poId',
  'liftId'
]);

const FLOAT_FIELDS = new Set([
  'totalPoAmount',
  'numberOfDays',
  'payAmount',
  'totalPaidAmount',
  'outstandingAmount'
]);

const INT_FIELDS = new Set([
  'poId',
  'liftId'
]);

const BOOLEAN_FIELDS = new Set([
  'paymentDone'
]);

const DATETIME_FIELDS = new Set([
  'timestamp',
  'deliveryDate'
]);

function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Try direct parse (e.g. ISO string or "YYYY-MM-DD")
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  // Try "DD-MM-YYYY HH:mm:ss A" or "DD-MM-YYYY" or "DD/MM/YYYY" format
  const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    let hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    const ampm = match[7] ? match[7].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const parsed = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function sanitizeData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    const val = body[key];
    if (val === undefined) continue;
    if (FLOAT_FIELDS.has(key)) {
      sanitized[key] = (val === null || val === '') ? null : (isNaN(Number(val)) ? null : Number(val));
      continue;
    }
    if (INT_FIELDS.has(key)) {
      sanitized[key] = (val === null || val === '') ? null : (isNaN(parseInt(val, 10)) ? null : parseInt(val, 10));
      continue;
    }
    if (BOOLEAN_FIELDS.has(key)) {
      sanitized[key] = val === true || val === 'true';
      continue;
    }
    if (DATETIME_FIELDS.has(key)) {
      sanitized[key] = parseDateValue(val);
      continue;
    }
    sanitized[key] = val !== null ? String(val) : null;
  }
  return sanitized;
}

// @desc    Create payment
// @route   POST /api/store/payment
const create = async (req, res, next) => {
  try {
    const data = await prisma.storePayment.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Update payment
// @route   PATCH /api/store/payment/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storePayment.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/store/payment/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storePayment.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
