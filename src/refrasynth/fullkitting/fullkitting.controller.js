const { prisma } = require('../../config/db');

// @desc    Get all fullkitting
// @route   GET /api/refrasynth/fullkitting
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthFullkitting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single fullkitting by ID
// @route   GET /api/refrasynth/fullkitting/:id
const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = isNaN(id)
      ? await prisma.refrasynthFullkitting.findFirst({ where: { indentNumber: req.params.id } })
      : await prisma.refrasynthFullkitting.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'timestamp',
  'indentNumber',
  'vendorName',
  'productName',
  'qty',
  'billNo',
  'transportingInclude',
  'transporterName',
  'amount',
  'amount1',
  'rateType',
  'vehicleNo',
  'driverName',
  'driverMobileNo',
  'from',
  'to',
  'materialLoadDetails',
  'biltyNumber',
  'biltyImage',
  'planned',
  'actual',
  'timeDelay',
  'status',
  'fmsName',
  'firmNameMatch',
  'indentId',
  'createdAt',
  'updatedAt'
]);

const FLOAT_FIELDS = new Set([
  'qty',
  'amount',
  'amount1'
]);

const INT_FIELDS = new Set([
  'indentId'
]);

const DATETIME_FIELDS = new Set([
  'timestamp',
  'createdAt',
  'updatedAt'
]);

function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

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

function sanitizeFullkittingData(body) {
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

// @desc    Create fullkitting
// @route   POST /api/refrasynth/fullkitting
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthFullkitting.create({
      data: sanitizeFullkittingData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fullkitting
// @route   PATCH /api/refrasynth/fullkitting/:id
const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sanitized = sanitizeFullkittingData(req.body);

    if (isNaN(id)) {
      // Find record by indentNumber
      const record = await prisma.refrasynthFullkitting.findFirst({
        where: { indentNumber: req.params.id }
      });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      const data = await prisma.refrasynthFullkitting.update({
        where: { id: record.id },
        data: sanitized
      });
      return res.json({ success: true, data });
    }

    const data = await prisma.refrasynthFullkitting.update({
      where: { id },
      data: sanitized
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete fullkitting
// @route   DELETE /api/refrasynth/fullkitting/:id
const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      await prisma.refrasynthFullkitting.deleteMany({
        where: { indentNumber: req.params.id }
      });
    } else {
      await prisma.refrasynthFullkitting.delete({
        where: { id }
      });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
