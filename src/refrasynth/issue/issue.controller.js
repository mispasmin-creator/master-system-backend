const { prisma } = require('../../config/db');

// @desc    Get all issue
// @route   GET /api/refrasynth/issue
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue by ID
// @route   GET /api/refrasynth/issue/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create issue
// @route   POST /api/refrasynth/issue
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update issue
// @route   PATCH /api/refrasynth/issue/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthIssue.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete issue
// @route   DELETE /api/refrasynth/issue/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthIssue.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
