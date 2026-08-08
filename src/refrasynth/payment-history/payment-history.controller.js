const { prisma } = require('../../config/db');

// @desc    Get all payment history records
// @route   GET /api/refrasynth/payment-history
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPaymentHistory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment history by ID
// @route   GET /api/refrasynth/payment-history/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPaymentHistory.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment history (supports bulk or single inserts)
// @route   POST /api/refrasynth/payment-history
const create = async (req, res, next) => {
  try {
    let data;
    if (Array.isArray(req.body)) {
      data = await prisma.refrasynthPaymentHistory.createMany({
        data: req.body
      });
    } else {
      data = await prisma.refrasynthPaymentHistory.create({
        data: req.body
      });
    }
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment history
// @route   PATCH /api/refrasynth/payment-history/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPaymentHistory.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment history
// @route   DELETE /api/refrasynth/payment-history/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthPaymentHistory.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
