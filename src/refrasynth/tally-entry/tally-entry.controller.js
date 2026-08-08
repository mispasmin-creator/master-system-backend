const { prisma } = require('../../config/db');

// @desc    Get all tally-entry
// @route   GET /api/refrasynth/tally-entry
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tally-entry by ID
// @route   GET /api/refrasynth/tally-entry/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tally-entry
// @route   POST /api/refrasynth/tally-entry
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tally-entry
// @route   PATCH /api/refrasynth/tally-entry/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tally-entry
// @route   DELETE /api/refrasynth/tally-entry/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthTallyEntry.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
