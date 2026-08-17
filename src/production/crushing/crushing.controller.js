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

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const sanitizeCrushingPayload = (body) => {
  const { outputs, ...runData } = body;
  const sanitized = { ...runData };
  if ('dateOfProduction' in sanitized) {
    sanitized.dateOfProduction = parseDate(sanitized.dateOfProduction);
  }
  if ('inputQty' in sanitized && sanitized.inputQty !== undefined && sanitized.inputQty !== null) {
    sanitized.inputQty = sanitized.inputQty === '' ? null : Number(sanitized.inputQty);
  }
  if ('machineHours' in sanitized && sanitized.machineHours !== undefined && sanitized.machineHours !== null) {
    sanitized.machineHours = sanitized.machineHours === '' ? null : Number(sanitized.machineHours);
  }
  if ('crushingItemId' in sanitized && !sanitized.crushingItemId) {
    sanitized.crushingItemId = null;
  }
  if ('semiActualRunId' in sanitized && !sanitized.semiActualRunId) {
    sanitized.semiActualRunId = null;
  }
  return { outputs, sanitizedRunData: sanitized };
};

// @desc    Create crushing (supports a nested `outputs` array so finished-goods
//          outputs can be created in the same call, mirroring the semi-actual
//          run's nested `materials` create pattern)
// @route   POST /api/production/crushing
const create = async (req, res, next) => {
  try {
    const { outputs, sanitizedRunData } = sanitizeCrushingPayload(req.body);
    const data = await prisma.productionCrushingRun.create({
      data: {
        ...sanitizedRunData,
        outputs: Array.isArray(outputs) && outputs.length
          ? { create: outputs.map((o, i) => ({ outputName: o.outputName, quantity: Number(o.quantity) || 0, processingCost: Number(o.processingCost) || 0, sequence: o.sequence ?? i + 1 })) }
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
    const { outputs, sanitizedRunData } = sanitizeCrushingPayload(req.body);
    const data = await prisma.productionCrushingRun.update({
      where: { id: req.params.id },
      data: sanitizedRunData,
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
