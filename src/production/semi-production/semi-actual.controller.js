const { prisma } = require('../../config/db');

// @desc    Get all semi-actual runs
// @route   GET /api/production/semi-actual
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiActualRun.findMany({
      include: { materials: true, semiJobCard: { include: { semiOrder: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single semi-actual run by ID
// @route   GET /api/production/semi-actual/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiActualRun.findUnique({
      where: { id: req.params.id },
      include: { materials: true, semiJobCard: { include: { semiOrder: true } } },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create semi-actual run
// @route   POST /api/production/semi-actual
const create = async (req, res, next) => {
  try {
    const { materials, ...runData } = req.body;
    const data = await prisma.productionSemiActualRun.create({
      data: {
        ...runData,
        materials: Array.isArray(materials) && materials.length
          ? { create: materials.map((m, i) => ({ materialName: m.materialName, quantity: m.quantity, sequence: m.sequence ?? i + 1 })) }
          : undefined,
      },
      include: { materials: true },
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update semi-actual run
// @route   PATCH /api/production/semi-actual/:id
const update = async (req, res, next) => {
  try {
    const { materials, ...runData } = req.body;
    const data = await prisma.productionSemiActualRun.update({
      where: { id: req.params.id },
      data: runData,
      include: { materials: true },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete semi-actual run
// @route   DELETE /api/production/semi-actual/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionSemiActualRun.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
