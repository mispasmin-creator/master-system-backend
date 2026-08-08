const { prisma } = require('../../config/db');

// @desc    Get all fullkitting
// @route   GET /api/refrasynth/fullkitting
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthFullkitting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single fullkitting by ID
// @route   GET /api/refrasynth/fullkitting/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthFullkitting.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create fullkitting
// @route   POST /api/refrasynth/fullkitting
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthFullkitting.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fullkitting
// @route   PATCH /api/refrasynth/fullkitting/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthFullkitting.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete fullkitting
// @route   DELETE /api/refrasynth/fullkitting/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthFullkitting.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
