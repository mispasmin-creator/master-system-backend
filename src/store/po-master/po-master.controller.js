const { prisma } = require('../../config/db');

// @desc    Get all po-master
// @route   GET /api/store/po-master
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storePoMaster.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single po-master by ID
// @route   GET /api/store/po-master/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storePoMaster.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'poNumber',
  'internalCode',
  'partyName',
  'product',
  'description',
  'quantity',
  'unit',
  'rate',
  'gst',
  'gstPercent',
  'discount',
  'discountPercent',
  'amount',
  'totalPoAmount',
  'packaging',
  'forwarding',
  'packagingAndForwarding',
  'pdf',
  'quotationNumber',
  'quotationDate',
  'enquiryNumber',
  'enquiryDate',
  'term1',
  'term2',
  'term3',
  'term4',
  'term5',
  'term6',
  'term7',
  'term8',
  'term9',
  'term10',
  'deliveryDays',
  'deliveryType',
  'deliveryDate',
  'paymentTerms',
  'totalPaidAmount',
  'outstandingAmount',
  'status',
  'firmNameMatch',
  'indentId',
  'createdAt',
  'updatedAt'
]);

const FLOAT_FIELDS = new Set([
  'quantity',
  'rate',
  'gst',
  'gstPercent',
  'discount',
  'discountPercent',
  'amount',
  'totalPoAmount',
  'packaging',
  'forwarding',
  'packagingAndForwarding',
  'deliveryDays',
  'totalPaidAmount',
  'outstandingAmount'
]);

const INT_FIELDS = new Set([
  'indentId'
]);

const DATETIME_FIELDS = new Set([
  'quotationDate',
  'enquiryDate',
  'deliveryDate',
  'createdAt',
  'updatedAt'
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
  // Example: "14-08-2026 01:06:41 PM"
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

function sanitizePoMasterData(body) {
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
      } else if (INT_FIELDS.has(key)) {
        if (val === null || val === undefined || val === '') {
          sanitized[key] = null;
        } else {
          const num = parseInt(val, 10);
          sanitized[key] = isNaN(num) ? null : num;
        }
      } else if (DATETIME_FIELDS.has(key)) {
        sanitized[key] = parseDateValue(val);
      } else {
        sanitized[key] = val !== undefined && val !== null ? String(val) : null;
      }
    }
  }
  return sanitized;
}

// @desc    Create po-master
// @route   POST /api/store/po-master
const create = async (req, res, next) => {
  try {
    const data = await prisma.storePoMaster.create({
      data: sanitizePoMasterData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update po-master
// @route   PATCH /api/store/po-master/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storePoMaster.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizePoMasterData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete po-master
// @route   DELETE /api/store/po-master/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storePoMaster.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
