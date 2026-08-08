const { prisma } = require('../../config/db');

// @desc    Get all store-in
// @route   GET /api/refrasynth/store-in
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStoreIn.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single store-in by ID
// @route   GET /api/refrasynth/store-in/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStoreIn.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create store-in
// @route   POST /api/refrasynth/store-in
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStoreIn.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store-in
// @route   PATCH /api/refrasynth/store-in/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStoreIn.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete store-in
// @route   DELETE /api/refrasynth/store-in/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthStoreIn.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
