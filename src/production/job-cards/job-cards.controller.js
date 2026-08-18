const { prisma } = require('../../config/db');

// @desc    Get all job-cards
// @route   GET /api/production/job-cards
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionJobCard.findMany({
      include: {
        order: true,
        actualRuns: { 
          include: { materials: true },
          orderBy: { createdAt: 'asc' }
        },
        qcChecks: {
          orderBy: { createdAt: 'asc' }
        },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job-cards by ID
// @route   GET /api/production/job-cards/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionJobCard.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const sanitizeJobCardPayload = (body) => {
  const payload = { ...body };
  if ('dateOfProduction' in payload) {
    payload.dateOfProduction = parseDate(payload.dateOfProduction);
  }
  if ('quantity' in payload && payload.quantity !== undefined && payload.quantity !== null) {
    payload.quantity = payload.quantity === '' ? null : Number(payload.quantity);
  }
  if ('orderId' in payload && !payload.orderId) {
    payload.orderId = null;
  }
  return payload;
};

// @desc    Create job-cards
// @route   POST /api/production/job-cards
const create = async (req, res, next) => {
  try {
    const payload = sanitizeJobCardPayload(req.body);
    const data = await prisma.productionJobCard.create({
      data: payload
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job-cards
// @route   PATCH /api/production/job-cards/:id
const update = async (req, res, next) => {
  try {
    const payload = sanitizeJobCardPayload(req.body);
    const data = await prisma.productionJobCard.update({
      where: { id: req.params.id },
      data: payload
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job-cards
// @route   DELETE /api/production/job-cards/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionJobCard.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
