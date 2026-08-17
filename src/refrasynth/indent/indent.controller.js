const { prisma } = require('../../config/db');

// @desc    Get all indent
// @route   GET /api/refrasynth/indent
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single indent by ID
// @route   GET /api/refrasynth/indent/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'indentNumber',
  'timestamp',
  'firmName',
  'indenterName',
  'department',
  'areaOfUse',
  'groupHead',
  'productName',
  'quantity',
  'uom',
  'specifications',
  'indentApprovedBy',
  'indentType',
  'attachment',
  'planned1',
  'actual1',
  'timeDelay1',
  'vendorType',
  'approvedQuantity',
  'planned2',
  'actual2',
  'timeDelay2',
  'vendorName1',
  'rate1',
  'paymentTerm1',
  'vendorName2',
  'rate2',
  'paymentTerm2',
  'vendorName3',
  'rate3',
  'paymentTerm3',
  'comparisonSheet',
  'planned3',
  'actual3',
  'timeDelay3',
  'planned4',
  'actual4',
  'timeDelay4',
  'approvedVendorName',
  'approvedRate',
  'approvedPaymentTerm',
  'approvedDate',
  'poRequired',
  'poNumber',
  'poCopy',
  'pendingPoQty',
  'planned5',
  'actual5',
  'timeDelay5',
  'receiveStatus',
  'issuedQuantity',
  'issueStatus',
  'liftingStatus',
  'indentStatus',
  'pendingLiftQty',
  'pendingQty',
  'totalQty',
  'receivedQty',
  'firmNameMatch',
  'createdAt',
  'updatedAt'
]);

const FLOAT_FIELDS = new Set([
  'quantity',
  'approvedQuantity',
  'rate1',
  'rate2',
  'rate3',
  'approvedRate',
  'pendingPoQty',
  'issuedQuantity',
  'pendingLiftQty',
  'pendingQty',
  'totalQty',
  'receivedQty'
]);

const DATETIME_FIELDS = new Set([
  'timestamp',
  'approvedDate',
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
  return isNaN(d.getTime()) ? null : d;
}

function sanitizeIndentData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      const val = body[key];
      if (val === undefined) continue;
      if (FLOAT_FIELDS.has(key)) {
        if (val === null || val === '') {
          sanitized[key] = null;
        } else {
          const num = Number(val);
          sanitized[key] = isNaN(num) ? null : num;
        }
      } else if (DATETIME_FIELDS.has(key)) {
        sanitized[key] = parseDateValue(val);
      } else {
        sanitized[key] = val !== null ? String(val) : null;
      }
    }
  }
  return sanitized;
}

// @desc    Create indent
// @route   POST /api/refrasynth/indent
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.create({
      data: sanitizeIndentData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update indent
// @route   PATCH /api/refrasynth/indent/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeIndentData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete indent
// @route   DELETE /api/refrasynth/indent/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthIndent.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
