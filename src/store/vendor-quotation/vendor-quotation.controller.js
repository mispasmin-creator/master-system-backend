const { prisma } = require('../../config/db');

// @desc    Get all vendor-quotation
// @route   GET /api/store/vendor-quotation
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeVendorQuotation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor-quotation by ID
// @route   GET /api/store/vendor-quotation/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeVendorQuotation.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'indentId',
  'vendorType',
  'poRequired',
  'vendorName1',
  'rate1',
  'paymentTerm1',
  'vendorName2',
  'rate2',
  'paymentTerm2',
  'vendorName3',
  'rate3',
  'paymentTerm3',
  'comparisonSheet'
]);

const FLOAT_FIELDS = new Set([
  'rate1',
  'rate2',
  'rate3'
]);

const INT_FIELDS = new Set([
  'indentId'
]);




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
    
    
    sanitized[key] = val !== null ? String(val) : null;
  }
  return sanitized;
}

// @desc    Create vendor-quotation
// @route   POST /api/store/vendor-quotation
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeVendorQuotation.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Upsert vendor-quotation for its parent record (create if missing, update if it already exists)
// @route   PUT /api/store/vendor-quotation/by-parent/:parentId
const upsertByParent = async (req, res, next) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);
    if (isNaN(parentId)) return res.status(400).json({ success: false, message: 'Invalid parent id' });
    const data = sanitizeData(req.body);
    delete data.indentId;
    const record = await prisma.storeVendorQuotation.upsert({
      where: { indentId: parentId },
      create: { indentId: parentId, ...data },
      update: data
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor-quotation
// @route   PATCH /api/store/vendor-quotation/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeVendorQuotation.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vendor-quotation
// @route   DELETE /api/store/vendor-quotation/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeVendorQuotation.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, upsertByParent, update, remove };
