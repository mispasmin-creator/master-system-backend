const { prisma } = require('../../config/db');

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const sanitizeJobCardPayload = (body) => {
  const payload = { ...body };
  if ('dateOfProduction' in payload) {
    payload.dateOfProduction = parseDate(payload.dateOfProduction);
  }
  if ('qty' in payload && payload.qty !== undefined && payload.qty !== null) {
    payload.qty = payload.qty === '' ? null : Number(payload.qty);
  }
  if ('semiOrderId' in payload && !payload.semiOrderId) {
    payload.semiOrderId = null;
  }
  return payload;
};

const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiJobCard.findMany({
      include: {
        semiOrder: true,
        actualRuns: {
          include: { materials: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionSemiJobCard.findUnique({
      where: { id: req.params.id },
      include: {
        semiOrder: true,
        actualRuns: {
          include: { materials: true }
        }
      }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = sanitizeJobCardPayload(req.body);
    const data = await prisma.productionSemiJobCard.create({
      data: payload,
      include: {
        semiOrder: true,
        actualRuns: {
          include: { materials: true }
        }
      }
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const payload = sanitizeJobCardPayload(req.body);
    const data = await prisma.productionSemiJobCard.update({
      where: { id: req.params.id },
      data: payload,
      include: {
        semiOrder: true,
        actualRuns: {
          include: { materials: true }
        }
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.productionSemiJobCard.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };