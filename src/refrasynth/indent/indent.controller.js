const { prisma } = require('../../config/db');

// @desc    Get all indent
// @route   GET /api/refrasynth/indent
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single indent by ID
// @route   GET /api/refrasynth/indent/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create indent
// @route   POST /api/refrasynth/indent
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update indent
// @route   PATCH /api/refrasynth/indent/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIndent.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete indent
// @route   DELETE /api/refrasynth/indent/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthIndent.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
