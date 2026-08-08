const { prisma } = require('../../config/db');

// @desc    Get all kyc
// @route   GET /api/production/kyc
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionKyc.findMany();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single kyc by ID
// @route   GET /api/production/kyc/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionKyc.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create kyc
// @route   POST /api/production/kyc
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionKyc.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update kyc
// @route   PATCH /api/production/kyc/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionKyc.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete kyc
// @route   DELETE /api/production/kyc/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionKyc.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
