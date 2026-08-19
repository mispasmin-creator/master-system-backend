const { prisma } = require('../../config/db');

// @desc    Get all reject-grn
// @route   GET /api/store/reject-grn
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeRejectGrn.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reject-grn by ID
// @route   GET /api/store/reject-grn/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeRejectGrn.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'liftId',
  'status',
  'reason',
  'billCopyAttached',
  'sendDebitNote'
]);


const INT_FIELDS = new Set([
  'liftId'
]);




function sanitizeData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    const val = body[key];
    if (val === undefined) continue;
    
    if (INT_FIELDS.has(key)) {
      sanitized[key] = (val === null || val === '') ? null : (isNaN(parseInt(val, 10)) ? null : parseInt(val, 10));
      continue;
    }
    
    
    sanitized[key] = val !== null ? String(val) : null;
  }
  return sanitized;
}

// @desc    Create reject-grn
// @route   POST /api/store/reject-grn
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeRejectGrn.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Upsert reject-grn for its parent record (create if missing, update if it already exists)
// @route   PUT /api/store/reject-grn/by-parent/:parentId
const upsertByParent = async (req, res, next) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);
    if (isNaN(parentId)) return res.status(400).json({ success: false, message: 'Invalid parent id' });
    const data = sanitizeData(req.body);
    delete data.liftId;
    const record = await prisma.storeRejectGrn.upsert({
      where: { liftId: parentId },
      create: { liftId: parentId, ...data },
      update: data
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update reject-grn
// @route   PATCH /api/store/reject-grn/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeRejectGrn.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reject-grn
// @route   DELETE /api/store/reject-grn/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeRejectGrn.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, upsertByParent, update, remove };
