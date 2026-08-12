const { prisma } = require('../../config/db');

// @desc    Get all orders
// @route   GET /api/production/orders
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionOrder.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single orders by ID
// @route   GET /api/production/orders/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionOrder.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create orders
// @route   POST /api/production/orders
const create = async (req, res, next) => {
  try {
    if (Array.isArray(req.body)) {
      const created = await Promise.all(
        req.body.map((item) => prisma.productionOrder.create({ data: item }))
      );
      return res.status(201).json({ success: true, data: created });
    }
    const data = await prisma.productionOrder.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update orders
// @route   PATCH /api/production/orders/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete orders
// @route   DELETE /api/production/orders/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionOrder.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
