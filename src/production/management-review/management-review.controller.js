const { prisma } = require('../../config/db');

// @desc    Get all management-review
// @route   GET /api/production/management-review
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionManagementReview.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single management-review by ID
// @route   GET /api/production/management-review/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionManagementReview.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create management-review
// @route   POST /api/production/management-review
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionManagementReview.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update management-review
// @route   PATCH /api/production/management-review/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionManagementReview.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete management-review
// @route   DELETE /api/production/management-review/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionManagementReview.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
