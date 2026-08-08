const { prisma } = require('../../config/db');

// @desc    Get all master
// @route   GET /api/production/master
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionMaster.findMany();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single master by ID
// @route   GET /api/production/master/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionMaster.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create master
// @route   POST /api/production/master
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionMaster.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update master
// @route   PATCH /api/production/master/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionMaster.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete master
// @route   DELETE /api/production/master/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionMaster.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
