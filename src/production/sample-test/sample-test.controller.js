const { prisma } = require('../../config/db');

// @desc    Get all sample-test
// @route   GET /api/production/sample-test
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionSampleTest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sample-test by ID
// @route   GET /api/production/sample-test/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionSampleTest.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create sample-test
// @route   POST /api/production/sample-test
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionSampleTest.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sample-test
// @route   PATCH /api/production/sample-test/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionSampleTest.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete sample-test
// @route   DELETE /api/production/sample-test/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionSampleTest.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
