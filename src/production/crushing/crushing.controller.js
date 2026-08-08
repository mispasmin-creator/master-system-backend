const { prisma } = require('../../config/db');

// @desc    Get all crushing
// @route   GET /api/production/crushing
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionCrushingRun.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single crushing by ID
// @route   GET /api/production/crushing/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionCrushingRun.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create crushing
// @route   POST /api/production/crushing
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionCrushingRun.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update crushing
// @route   PATCH /api/production/crushing/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionCrushingRun.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete crushing
// @route   DELETE /api/production/crushing/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionCrushingRun.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
