const { prisma } = require('../../config/db');

// @desc    Get all crushing
// @route   GET /api/production/crushing
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionCrushingRun.findMany({
      include: { crushingItem: true, outputs: true },
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
      where: { id: req.params.id },
      include: { crushingItem: true, outputs: true },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create crushing (supports a nested `outputs` array so finished-goods
//          outputs can be created in the same call, mirroring the semi-actual
//          run's nested `materials` create pattern)
// @route   POST /api/production/crushing
const create = async (req, res, next) => {
  try {
    const { outputs, ...runData } = req.body;
    const data = await prisma.productionCrushingRun.create({
      data: {
        ...runData,
        outputs: Array.isArray(outputs) && outputs.length
          ? { create: outputs.map((o, i) => ({ outputName: o.outputName, quantity: o.quantity, processingCost: o.processingCost, sequence: o.sequence ?? i + 1 })) }
          : undefined,
      },
      include: { crushingItem: true, outputs: true },
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
    const { outputs, ...runData } = req.body;
    const data = await prisma.productionCrushingRun.update({
      where: { id: req.params.id },
      data: runData,
      include: { crushingItem: true, outputs: true },
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
