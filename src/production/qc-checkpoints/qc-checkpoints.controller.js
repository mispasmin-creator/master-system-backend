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

// @desc    Create qc-checkpoints
// @route   POST /api/production/qc-checkpoints
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionQcCheckpoint.create({
      data: req.body
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
    const data = await prisma.productionQcCheckpoint.update({
      where: { id: req.params.id },
      data: req.body
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
