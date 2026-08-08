const { prisma } = require('../../config/db');

// @desc    Get all invoices
// @route   GET /api/rmsales/invoice
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesInvoice.findMany({
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

// @desc    Get single invoice by ID
// @route   GET /api/rmsales/invoice/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesInvoice.findUnique({
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

// @desc    Create invoice for an order and mark completed
// @route   POST /api/rmsales/invoice
const create = async (req, res, next) => {
  try {
    const { orderId, invoiceNo, invoiceCopyUrl } = req.body;

    const parsedOrderId = parseInt(orderId, 10);
    if (!parsedOrderId) {
      return res.status(400).json({ success: false, message: 'Valid orderId is required.' });
    }
    if (!invoiceNo || !String(invoiceNo).trim()) {
      return res.status(400).json({ success: false, message: 'Invoice number is required.' });
    }

    const trimmedInvoiceNo = String(invoiceNo).trim();

    const data = await prisma.$transaction(async (tx) => {
      const order = await tx.rmSalesOrder.findUnique({
        where: { id: parsedOrderId },
      });

      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      if (order.status !== 'Pending Invoice') {
        const err = new Error(`Order status must be 'Pending Invoice' to create an invoice. Current status: '${order.status}'`);
        err.statusCode = 400;
        throw err;
      }

      // Check invoiceNo uniqueness
      const existingInvoice = await tx.rmSalesInvoice.findUnique({
        where: { invoiceNo: trimmedInvoiceNo },
      });
      if (existingInvoice) {
        const err = new Error(`Invoice number '${trimmedInvoiceNo}' already exists.`);
        err.statusCode = 400;
        throw err;
      }

      const invoice = await tx.rmSalesInvoice.create({
        data: {
          orderId: parsedOrderId,
          invoiceNo: trimmedInvoiceNo,
          invoiceCopyUrl: invoiceCopyUrl || null,
        },
      });

      const updatedOrder = await tx.rmSalesOrder.update({
        where: { id: parsedOrderId },
        data: {
          status: 'Completed',
          updatedAt: new Date(),
        },
      });

      let inventoryUpdated = null;
      let productUpdated = null;

      if (order.productId) {
        // Increment soldQty in inventory
        inventoryUpdated = await tx.rmSalesInventory.upsert({
          where: { productId: order.productId },
          update: {
            soldQty: { increment: order.qty },
            updatedAt: new Date(),
          },
          create: {
            productId: order.productId,
            availableQty: 0,
            soldQty: order.qty,
            updatedAt: new Date(),
          },
        });

        // Decrement availableQty in product
        productUpdated = await tx.rmSalesProduct.update({
          where: { id: order.productId },
          data: {
            availableQty: { decrement: order.qty },
            updatedAt: new Date(),
          },
        });
      }

      await tx.rmSalesActivityLog.create({
        data: {
          userRole: req.user?.role || null,
          userName: req.user?.name || req.user?.email || null,
          action: 'Order Completed',
          details: {
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            orderId: updatedOrder.id,
            orderNo: updatedOrder.orderNo,
            productId: order.productId,
            productName: order.productName,
            qtyDeducted: order.qty,
            previousOrderStatus: order.status,
            newOrderStatus: updatedOrder.status,
            productAvailableQtyAfter: productUpdated ? productUpdated.availableQty : null,
            inventorySoldQtyAfter: inventoryUpdated ? inventoryUpdated.soldQty : null,
          },
        },
      });

      return invoice;
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getOne, create };
