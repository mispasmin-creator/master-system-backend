const { prisma } = require('../../config/db');

// @desc    Get all user
// @route   GET /api/refrasynth/user
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthUser.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/refrasynth/user/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthUser.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/refrasynth/user
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthUser.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PATCH /api/refrasynth/user/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthUser.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/refrasynth/user/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthUser.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
