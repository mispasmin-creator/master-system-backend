const { prisma } = require('../../config/db');

// @desc    Get all inventory
// @route   GET /api/refrasynth/inventory
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthInventory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory by ID
// @route   GET /api/refrasynth/inventory/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthInventory.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create inventory
// @route   POST /api/refrasynth/inventory
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthInventory.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory
// @route   PATCH /api/refrasynth/inventory/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthInventory.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inventory
// @route   DELETE /api/refrasynth/inventory/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthInventory.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
