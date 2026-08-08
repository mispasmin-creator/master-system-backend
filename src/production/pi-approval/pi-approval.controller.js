const { prisma } = require('../../config/db');

// @desc    Get all pi-approval
// @route   GET /api/production/pi-approval
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionPiApproval.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single pi-approval by ID
// @route   GET /api/production/pi-approval/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionPiApproval.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create pi-approval
// @route   POST /api/production/pi-approval
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionPiApproval.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update pi-approval
// @route   PATCH /api/production/pi-approval/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionPiApproval.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete pi-approval
// @route   DELETE /api/production/pi-approval/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionPiApproval.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
