const { prisma } = require('../../config/db');

// @desc    Get all qc-checkpoints
// @route   GET /api/production/qc-checkpoints
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionQcCheckpoint.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single qc-checkpoints by ID
// @route   GET /api/production/qc-checkpoints/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionQcCheckpoint.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const parseDate = (val) => {
  if (!val || String(val).trim() === '' || String(val).trim() === '-') return null;
  const text = String(val).trim();
  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yy] = ddmmyyyy;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d;
};

const sanitizeQcPayload = (body) => {
  const payload = { ...body };
  if ('dateOfTest' in payload) {
    payload.dateOfTest = parseDate(payload.dateOfTest);
  }
  const floatFields = [
    'wcPercent', 'bdAt110c', 'ccsAt100c', 'aluminaPercent', 'ironPercent',
    'silicaPercent', 'calciumPercent', 'bdAt1100c', 'ccsAt1100c', 'plcAt1100c'
  ];
  floatFields.forEach((field) => {
    if (field in payload && payload[field] !== undefined && payload[field] !== null) {
      payload[field] = payload[field] === '' ? null : Number(payload[field]);
    }
  });
  if ('jobCardId' in payload && !payload.jobCardId) {
    payload.jobCardId = null;
  }
  return payload;
};

// @desc    Create qc-checkpoints
// @route   POST /api/production/qc-checkpoints
const create = async (req, res, next) => {
  try {
    const payload = sanitizeQcPayload(req.body);
    const data = await prisma.productionQcCheckpoint.create({
      data: payload
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update qc-checkpoints
// @route   PATCH /api/production/qc-checkpoints/:id
const update = async (req, res, next) => {
  try {
    const payload = sanitizeQcPayload(req.body);
    const data = await prisma.productionQcCheckpoint.update({
      where: { id: req.params.id },
      data: payload
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete qc-checkpoints
// @route   DELETE /api/production/qc-checkpoints/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionQcCheckpoint.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
