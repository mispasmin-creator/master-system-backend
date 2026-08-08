const { prisma } = require('../../config/db');

// @desc    Get all po-master
// @route   GET /api/refrasynth/po-master
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPoMaster.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single po-master by ID
// @route   GET /api/refrasynth/po-master/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPoMaster.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create po-master
// @route   POST /api/refrasynth/po-master
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPoMaster.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update po-master
// @route   PATCH /api/refrasynth/po-master/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthPoMaster.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete po-master
// @route   DELETE /api/refrasynth/po-master/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthPoMaster.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
