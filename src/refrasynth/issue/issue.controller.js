const { prisma } = require('../../config/db');

// @desc    Get all issue
// @route   GET /api/refrasynth/issue
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue by ID
// @route   GET /api/refrasynth/issue/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.findUnique({
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
  'issueNo',
  'issueTo',
  'uom',
  'productName',
  'quantity',
  'department',
  'groupHead',
  'planned1',
  'actual1',
  'timeDelay1',
  'status',
  'givenQty',
  'location',
  'firmNameMatch',
  'createdAt',
  'updatedAt'
]);

const FLOAT_FIELDS = new Set([
  'quantity',
  'givenQty'
]);

function sanitizeIssueData(body) {
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
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
}

// @desc    Create issue
// @route   POST /api/refrasynth/issue
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.create({
      data: sanitizeIssueData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update issue
// @route   PATCH /api/refrasynth/issue/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeIssueData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete issue
// @route   DELETE /api/refrasynth/issue/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthIssue.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
