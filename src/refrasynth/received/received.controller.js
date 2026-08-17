const { prisma } = require('../../config/db');

const serialize = (data) => JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));

// @desc    Get all refrasynth_received records
// @route   GET /api/refrasynth/received
const getAll = async (req, res, next) => {
  try {
    const records = await prisma.refrasynthReceived.findMany({
      orderBy: { id: 'desc' }
    });
    res.json({ success: true, data: serialize(records) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single record
// @route   GET /api/refrasynth/received/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthReceived.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create refrasynth_received record
// @route   POST /api/refrasynth/received
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthReceived.create({
      data: req.body
    });
    res.status(201).json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update refrasynth_received record
// @route   PATCH /api/refrasynth/received/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthReceived.update({
      where: { id: BigInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete refrasynth_received record
// @route   DELETE /api/refrasynth/received/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthReceived.delete({
      where: { id: BigInt(req.params.id) }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
