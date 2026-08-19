const { prisma } = require('../../config/db');

const serialize = (data) => JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));

// @desc    Get all store_received records
// @route   GET /api/store/received
const getAll = async (req, res, next) => {
  try {
    const records = await prisma.storeReceived.findMany({
      orderBy: { id: 'desc' }
    });
    res.json({ success: true, data: serialize(records) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single record
// @route   GET /api/store/received/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeReceived.findUnique({
      where: { id: BigInt(req.params.id) }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create store_received record
// @route   POST /api/store/received
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeReceived.create({
      data: req.body
    });
    res.status(201).json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store_received record
// @route   PATCH /api/store/received/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeReceived.update({
      where: { id: BigInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, data: serialize(data) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete store_received record
// @route   DELETE /api/store/received/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeReceived.delete({
      where: { id: BigInt(req.params.id) }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
