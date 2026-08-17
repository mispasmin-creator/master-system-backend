const { prisma } = require('../../config/db');

const serialize = (data) => JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));

// @desc    Get all refrasynth_stock records
// @route   GET /api/refrasynth/stock
const getAll = async (req, res, next) => {
  try {
    const records = await prisma.refrasynthStock.findMany({
      orderBy: { id: 'desc' }
    });
    res.json({ success: true, data: serialize(records) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single record
// @route   GET /api/refrasynth/stock/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStock.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create refrasynth_stock record
// @route   POST /api/refrasynth/stock
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStock.create({
      data: req.body
    });
    res.status(201).json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update refrasynth_stock record
// @route   PATCH /api/refrasynth/stock/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStock.update({
      where: { id: BigInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete refrasynth_stock record
// @route   DELETE /api/refrasynth/stock/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthStock.delete({
      where: { id: BigInt(req.params.id) }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
