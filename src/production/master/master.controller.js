const { prisma } = require('../../config/db');

// @desc    Get all master
// @route   GET /api/production/master
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionMaster.findMany({
      orderBy: { createdAt: 'asc' },
    });
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
      where: { id: req.params.id },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Master entry not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create master
// @route   POST /api/production/master
const create = async (req, res, next) => {
  try {
    const {
      priority,
      supervisorName,
      shift,
      testStatus,
      testedBy,
      status,
      firmName,
      materialName,
      flowOfMaterial,
      sfSupervisorName,
      nameOfRawMaterial,
      finishedGoodsName,
      crushingProductName,
    } = req.body;

    const data = {
      priority: priority?.trim() || null,
      supervisorName: supervisorName?.trim() || null,
      shift: shift?.trim() || null,
      testStatus: testStatus?.trim() || null,
      testedBy: testedBy?.trim() || null,
      status: status?.trim() || null,
      firmName: firmName?.trim() || null,
      materialName: materialName?.trim() || null,
      flowOfMaterial: flowOfMaterial?.trim() || null,
      sfSupervisorName: sfSupervisorName?.trim() || null,
      nameOfRawMaterial: nameOfRawMaterial?.trim() || null,
      finishedGoodsName: finishedGoodsName?.trim() || null,
      crushingProductName: crushingProductName?.trim() || null,
    };

    const created = await prisma.productionMaster.create({
      data,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

// @desc    Update master
// @route   PATCH /api/production/master/:id
const update = async (req, res, next) => {
  try {
    const existing = await prisma.productionMaster.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Master entry not found' });
    }

    const {
      priority,
      supervisorName,
      shift,
      testStatus,
      testedBy,
      status,
      firmName,
      materialName,
      flowOfMaterial,
      sfSupervisorName,
      nameOfRawMaterial,
      finishedGoodsName,
      crushingProductName,
    } = req.body;

    const data = {};
    if (priority !== undefined) data.priority = priority?.trim() || null;
    if (supervisorName !== undefined) data.supervisorName = supervisorName?.trim() || null;
    if (shift !== undefined) data.shift = shift?.trim() || null;
    if (testStatus !== undefined) data.testStatus = testStatus?.trim() || null;
    if (testedBy !== undefined) data.testedBy = testedBy?.trim() || null;
    if (status !== undefined) data.status = status?.trim() || null;
    if (firmName !== undefined) data.firmName = firmName?.trim() || null;
    if (materialName !== undefined) data.materialName = materialName?.trim() || null;
    if (flowOfMaterial !== undefined) data.flowOfMaterial = flowOfMaterial?.trim() || null;
    if (sfSupervisorName !== undefined) data.sfSupervisorName = sfSupervisorName?.trim() || null;
    if (nameOfRawMaterial !== undefined) data.nameOfRawMaterial = nameOfRawMaterial?.trim() || null;
    if (finishedGoodsName !== undefined) data.finishedGoodsName = finishedGoodsName?.trim() || null;
    if (crushingProductName !== undefined) data.crushingProductName = crushingProductName?.trim() || null;
    data.updatedAt = new Date();

    const updated = await prisma.productionMaster.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete master
// @route   DELETE /api/production/master/:id
const remove = async (req, res, next) => {
  try {
    const existing = await prisma.productionMaster.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Master entry not found' });
    }

    await prisma.productionMaster.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Master entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
