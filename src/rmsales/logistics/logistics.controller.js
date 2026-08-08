const { prisma } = require('../../config/db');

// Helper to compute freight amount
const computeFreightAmount = (rateType, rateValue, actualTruckQty) => {
  const numRate = parseFloat(rateValue) || 0;
  const numQty = parseFloat(actualTruckQty) || 0;
  if (rateType === 'Fixed') {
    return numRate;
  }
  // Default to Per Ton / Per Unit rate calculation
  return numQty * numRate;
};

// @desc    Get all logistics records
// @route   GET /api/rmsales/logistics
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesLogistics.findMany({
      orderBy: { id: 'desc' },
      include: {
        order: true,
      },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single logistics record by ID
// @route   GET /api/rmsales/logistics/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesLogistics.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      include: {
        order: true,
      },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create logistics entry for an order
// @route   POST /api/rmsales/logistics
const create = async (req, res, next) => {
  try {
    const {
      orderId,
      transporterName,
      truckNo,
      biltyNo,
      actualTruckQty,
      biltyCopyUrl,
      rateType,
      rateValue,
    } = req.body;

    const parsedOrderId = parseInt(orderId, 10);
    if (!parsedOrderId) {
      return res.status(400).json({ success: false, message: 'Valid orderId is required.' });
    }

    const data = await prisma.$transaction(async (tx) => {
      const order = await tx.rmSalesOrder.findUnique({
        where: { id: parsedOrderId },
      });

      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      if (order.status !== 'Pending Logistics') {
        const err = new Error(`Order status must be 'Pending Logistics' to create logistics entry. Current status: '${order.status}'`);
        err.statusCode = 400;
        throw err;
      }

      const freightAmount = computeFreightAmount(rateType, rateValue, actualTruckQty);

      const logistics = await tx.rmSalesLogistics.create({
        data: {
          orderId: parsedOrderId,
          transporterName,
          truckNo,
          biltyNo,
          actualTruckQty: parseFloat(actualTruckQty),
          biltyCopyUrl: biltyCopyUrl || null,
          rateType,
          rateValue: parseFloat(rateValue),
          freightAmount,
        },
      });

      const updatedOrder = await tx.rmSalesOrder.update({
        where: { id: parsedOrderId },
        data: {
          status: 'Pending Invoice',
          updatedAt: new Date(),
        },
      });

      await tx.rmSalesActivityLog.create({
        data: {
          userRole: req.user?.role || null,
          userName: req.user?.name || req.user?.email || null,
          action: 'Logistics Added',
          details: {
            logisticsId: logistics.id,
            orderId: updatedOrder.id,
            orderNo: updatedOrder.orderNo,
            transporterName: logistics.transporterName,
            truckNo: logistics.truckNo,
            biltyNo: logistics.biltyNo,
            freightAmount: logistics.freightAmount,
            previousOrderStatus: order.status,
            newOrderStatus: updatedOrder.status,
          },
        },
      });

      return logistics;
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update logistics entry
// @route   PATCH /api/rmsales/logistics/:id
const update = async (req, res, next) => {
  try {
    const logisticsId = parseInt(req.params.id, 10) || req.params.id;

    const data = await prisma.$transaction(async (tx) => {
      const existing = await tx.rmSalesLogistics.findUnique({
        where: { id: logisticsId },
      });

      if (!existing) {
        const err = new Error('Logistics record not found');
        err.statusCode = 404;
        throw err;
      }

      const rateType = req.body.rateType !== undefined ? req.body.rateType : existing.rateType;
      const rateValue = req.body.rateValue !== undefined ? req.body.rateValue : existing.rateValue;
      const actualTruckQty = req.body.actualTruckQty !== undefined ? req.body.actualTruckQty : existing.actualTruckQty;

      const freightAmount = computeFreightAmount(rateType, rateValue, actualTruckQty);

      const updateData = {
        ...req.body,
        rateType,
        rateValue: parseFloat(rateValue),
        actualTruckQty: parseFloat(actualTruckQty),
        freightAmount,
        updatedAt: new Date(),
      };
      // Prevent mutating relation/ID fields directly if passed in body
      delete updateData.id;
      delete updateData.orderId;

      const updated = await tx.rmSalesLogistics.update({
        where: { id: logisticsId },
        data: updateData,
      });

      await tx.rmSalesActivityLog.create({
        data: {
          userRole: req.user?.role || null,
          userName: req.user?.name || req.user?.email || null,
          action: 'Logistics Updated',
          details: {
            logisticsId: updated.id,
            orderId: updated.orderId,
            freightAmount: updated.freightAmount,
          },
        },
      });

      return updated;
    });

    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getOne, create, update };
