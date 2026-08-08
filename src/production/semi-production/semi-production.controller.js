const { prisma } = require('../../config/db');

// @desc    Get all semi-production
// @route   GET /api/production/semi-production
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiOrder.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single semi-production by ID
// @route   GET /api/production/semi-production/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiOrder.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create semi-production
// @route   POST /api/production/semi-production
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiOrder.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update semi-production
// @route   PATCH /api/production/semi-production/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiOrder.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete semi-production
// @route   DELETE /api/production/semi-production/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionSemiOrder.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
