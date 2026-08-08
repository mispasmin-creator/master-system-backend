const { prisma } = require('../../config/db');

// @desc    Get all costing
// @route   GET /api/production/costing
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionCosting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single costing by ID
// @route   GET /api/production/costing/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionCosting.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create costing
// @route   POST /api/production/costing
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionCosting.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update costing
// @route   PATCH /api/production/costing/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionCosting.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete costing
// @route   DELETE /api/production/costing/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionCosting.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
