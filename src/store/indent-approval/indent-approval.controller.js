const { prisma } = require('../../config/db');

// @desc    Get all indent-approval
// @route   GET /api/store/indent-approval
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeIndentApproval.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single indent-approval by ID
// @route   GET /api/store/indent-approval/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeIndentApproval.findUnique({
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
  'approvedQuantity',
  'vendorType'
]);

const FLOAT_FIELDS = new Set([
  'approvedQuantity'
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

// @desc    Create indent-approval
// @route   POST /api/store/indent-approval
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeIndentApproval.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Upsert indent-approval for its parent record (create if missing, update if it already exists)
// @route   PUT /api/store/indent-approval/by-parent/:parentId
const upsertByParent = async (req, res, next) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);
    if (isNaN(parentId)) return res.status(400).json({ success: false, message: 'Invalid parent id' });
    const data = sanitizeData(req.body);
    delete data.indentId;
    const record = await prisma.storeIndentApproval.upsert({
      where: { indentId: parentId },
      create: { indentId: parentId, ...data },
      update: data
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update indent-approval
// @route   PATCH /api/store/indent-approval/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeIndentApproval.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete indent-approval
// @route   DELETE /api/store/indent-approval/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeIndentApproval.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, upsertByParent, update, remove };
