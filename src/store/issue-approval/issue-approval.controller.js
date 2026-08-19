const { prisma } = require('../../config/db');

// @desc    Get all issue-approval
// @route   GET /api/store/issue-approval
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeIssueApproval.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue-approval by ID
// @route   GET /api/store/issue-approval/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeIssueApproval.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'issueId',
  'status',
  'givenQty'
]);

const FLOAT_FIELDS = new Set([
  'givenQty'
]);

const INT_FIELDS = new Set([
  'issueId'
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

// @desc    Create issue-approval
// @route   POST /api/store/issue-approval
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeIssueApproval.create({
      data: sanitizeData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// @desc    Upsert issue-approval for its parent record (create if missing, update if it already exists)
// @route   PUT /api/store/issue-approval/by-parent/:parentId
const upsertByParent = async (req, res, next) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);
    if (isNaN(parentId)) return res.status(400).json({ success: false, message: 'Invalid parent id' });
    const data = sanitizeData(req.body);
    delete data.issueId;
    const record = await prisma.storeIssueApproval.upsert({
      where: { issueId: parentId },
      create: { issueId: parentId, ...data },
      update: data
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update issue-approval
// @route   PATCH /api/store/issue-approval/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeIssueApproval.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete issue-approval
// @route   DELETE /api/store/issue-approval/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeIssueApproval.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, upsertByParent, update, remove };
