const { prisma } = require('../../config/db');

// @desc    Get all debit-note
// @route   GET /api/store/debit-note
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeDebitNote.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single debit-note by ID
// @route   GET /api/store/debit-note/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeDebitNote.findUnique({
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
  'debitNoteCopy',
  'debitNoteNumber',
  'billCopy',
  'returnCopy'
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

// @desc    Create debit-note
// @route   POST /api/store/debit-note
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeDebitNote.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Upsert debit-note for its parent record (create if missing, update if it already exists)
// @route   PUT /api/store/debit-note/by-parent/:parentId
const upsertByParent = async (req, res, next) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);
    if (isNaN(parentId)) return res.status(400).json({ success: false, message: 'Invalid parent id' });
    const data = sanitizeData(req.body);
    delete data.liftId;
    const record = await prisma.storeDebitNote.upsert({
      where: { liftId: parentId },
      create: { liftId: parentId, ...data },
      update: data
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update debit-note
// @route   PATCH /api/store/debit-note/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeDebitNote.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete debit-note
// @route   DELETE /api/store/debit-note/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeDebitNote.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, upsertByParent, update, remove };
