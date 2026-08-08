const { prisma } = require('../../config/db');

// @desc    Get all full-kitting
// @route   GET /api/production/full-kitting
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionFullKitting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single full-kitting by ID
// @route   GET /api/production/full-kitting/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionFullKitting.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create full-kitting
// @route   POST /api/production/full-kitting
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionFullKitting.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update full-kitting
// @route   PATCH /api/production/full-kitting/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionFullKitting.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete full-kitting
// @route   DELETE /api/production/full-kitting/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionFullKitting.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
