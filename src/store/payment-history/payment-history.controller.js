const { prisma } = require('../../config/db');

// @desc    Get all payment-history
// @route   GET /api/store/payment-history
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storePaymentHistory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment-history by ID
// @route   GET /api/store/payment-history/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storePaymentHistory.findUnique({
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
  'billRemark'
]);




const DATETIME_FIELDS = new Set([
  'timestamp',
  'timestamp1'
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
    
    
    
    if (DATETIME_FIELDS.has(key)) {
      sanitized[key] = parseDateValue(val);
      continue;
    }
    sanitized[key] = val !== null ? String(val) : null;
  }
  return sanitized;
}

// @desc    Create payment-history
// @route   POST /api/store/payment-history
const create = async (req, res, next) => {
  try {
    const data = await prisma.storePaymentHistory.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Update payment-history
// @route   PATCH /api/store/payment-history/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storePaymentHistory.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment-history
// @route   DELETE /api/store/payment-history/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storePaymentHistory.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
