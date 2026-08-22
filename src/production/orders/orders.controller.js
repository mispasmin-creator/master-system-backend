const { prisma } = require('../../config/db');

// @desc    Get all orders
// @route   GET /api/production/orders
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: { receipt: { select: { orderNumberOfProduction: true, doNumber: true } } },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single orders by ID
// @route   GET /api/production/orders/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionOrder.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const parseDate = (val) => {
  if (!val || String(val).trim() === '' || String(val).trim() === '-') return null;
  const text = String(val).trim();
  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yy] = ddmmyyyy;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d;
};

const sanitizeOrderPayload = (body) => {
  const payload = { ...body };
  if ('expectedDeliveryDate' in payload) {
    payload.expectedDeliveryDate = parseDate(payload.expectedDeliveryDate);
  }
  if ('plannedDate' in payload) {
    payload.plannedDate = parseDate(payload.plannedDate);
  }
  if ('orderQuantity' in payload && payload.orderQuantity !== undefined && payload.orderQuantity !== null) {
    payload.orderQuantity = payload.orderQuantity === '' ? null : Number(payload.orderQuantity);
  }
  if ('quantityDelivered' in payload && payload.quantityDelivered !== undefined && payload.quantityDelivered !== null) {
    payload.quantityDelivered = payload.quantityDelivered === '' ? null : Number(payload.quantityDelivered);
  }
  if ('quantityInStock' in payload && payload.quantityInStock !== undefined && payload.quantityInStock !== null) {
    payload.quantityInStock = payload.quantityInStock === '' ? null : Number(payload.quantityInStock);
  }
  if ('productionPending' in payload && payload.productionPending !== undefined && payload.productionPending !== null) {
    payload.productionPending = payload.productionPending === '' ? null : Number(payload.productionPending);
  }
  if ('productRate' in payload && payload.productRate !== undefined && payload.productRate !== null) {
    payload.productRate = payload.productRate === '' ? null : Number(payload.productRate);
  }
  if ('receiptId' in payload && !payload.receiptId) {
    payload.receiptId = null;
  }
  return payload;
};

// @desc    Create orders
// @route   POST /api/production/orders
const create = async (req, res, next) => {
  try {
    if (Array.isArray(req.body)) {
      const created = await Promise.all(
        req.body.map((item) => prisma.productionOrder.create({ data: sanitizeOrderPayload(item) }))
      );
      return res.status(201).json({ success: true, data: created });
    }
    const data = await prisma.productionOrder.create({
      data: sanitizeOrderPayload(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update orders
// @route   PATCH /api/production/orders/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: sanitizeOrderPayload(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete orders
// @route   DELETE /api/production/orders/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionOrder.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
