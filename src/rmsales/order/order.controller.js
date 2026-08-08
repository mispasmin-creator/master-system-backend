const { prisma } = require('../../config/db');
const { nextSequenceNumber } = require('../../order/shared/sequence');

// @desc    List all orders
// @route   GET /api/rmsales/order
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesOrder.findMany({
      orderBy: { id: 'desc' },
      include: {
        logistics: true,
        invoice: true,
      },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID
// @route   GET /api/rmsales/order/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesOrder.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      include: {
        logistics: true,
        invoice: true,
      },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/rmsales/order
const create = async (req, res, next) => {
  try {
    const {
      firmName,
      partyName,
      productName,
      qty,
      rate,
      transportType,
      dispatchDate,
      poCopyUrl,
    } = req.body;

    if (!firmName || !partyName || !productName || qty === undefined || qty === null || rate === undefined || rate === null || !transportType || !dispatchDate) {
      return res.status(400).json({
        success: false,
        message: 'firmName, partyName, productName, qty, rate, transportType, and dispatchDate are required.',
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      const orderNo = await nextSequenceNumber(tx, {
        lockKey: 'rmsales_order_no',
        tableName: 'rmsales_order',
        column: 'order_no',
        regex: /^RM-(\d+)$/,
        prefix: 'RM-',
        pad: 4,
      });

      const product = await tx.rmSalesProduct.findUnique({
        where: { name: String(productName) },
      });

      const order = await tx.rmSalesOrder.create({
        data: {
          orderNo,
          firmName,
          partyName,
          productId: product ? product.id : null,
          productName,
          qty: parseFloat(qty),
          rate: parseFloat(rate),
          transportType,
          dispatchDate: new Date(dispatchDate),
          poCopyUrl: poCopyUrl || null,
          status: 'Pending Approval',
        },
      });

      await tx.rmSalesActivityLog.create({
        data: {
          userRole: req.user?.role || null,
          userName: req.user?.name || req.user?.email || null,
          action: 'Order Created',
          details: {
            orderId: order.id,
            orderNo: order.orderNo,
            firmName: order.firmName,
            partyName: order.partyName,
            productName: order.productName,
            qty: order.qty,
          },
        },
      });

      return order;
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve order
// @route   PATCH /api/rmsales/order/:id/approve
const approve = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10) || req.params.id;

    const data = await prisma.$transaction(async (tx) => {
      const existing = await tx.rmSalesOrder.findUnique({ where: { id: orderId } });
      if (!existing) {
        throw new Error('Order not found');
      }

      const approvedBy = req.user?.name || req.user?.email || req.body.approvedBy || 'System';

      const order = await tx.rmSalesOrder.update({
        where: { id: orderId },
        data: {
          status: 'Pending Logistics',
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.rmSalesActivityLog.create({
        data: {
          userRole: req.user?.role || null,
          userName: approvedBy,
          action: 'Order Approved',
          details: {
            orderId: order.id,
            orderNo: order.orderNo,
            previousStatus: existing.status,
            newStatus: order.status,
          },
        },
      });

      return order;
    });

    res.json({ success: true, data });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Reject order
// @route   PATCH /api/rmsales/order/:id/reject
const reject = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10) || req.params.id;

    const data = await prisma.$transaction(async (tx) => {
      const existing = await tx.rmSalesOrder.findUnique({ where: { id: orderId } });
      if (!existing) {
        throw new Error('Order not found');
      }

      const userName = req.user?.name || req.user?.email || req.body.userName || 'System';

      const order = await tx.rmSalesOrder.update({
        where: { id: orderId },
        data: {
          status: 'Rejected',
          updatedAt: new Date(),
        },
      });

      await tx.rmSalesActivityLog.create({
        data: {
          userRole: req.user?.role || null,
          userName,
          action: 'Order Rejected',
          details: {
            orderId: order.id,
            orderNo: order.orderNo,
            previousStatus: existing.status,
            newStatus: order.status,
            reason: req.body.reason || null,
          },
        },
      });

      return order;
    });

    res.json({ success: true, data });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getOne, create, approve, reject };
