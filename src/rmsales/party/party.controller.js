const { prisma } = require('../../config/db');

// @desc    Get all parties
// @route   GET /api/rmsales/party
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesParty.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single party by ID
// @route   GET /api/rmsales/party/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesParty.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create party
// @route   POST /api/rmsales/party
const create = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesParty.create({
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update party
// @route   PATCH /api/rmsales/party/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesParty.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete party
// @route   DELETE /api/rmsales/party/:id
const remove = async (req, res, next) => {
  try {
    await prisma.rmSalesParty.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
