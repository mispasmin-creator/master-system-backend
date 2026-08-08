const { prisma } = require('../../config/db');

// @desc    Get RM Sales dashboard KPI summary
// @route   GET /api/rmsales/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const orders = await prisma.rmSalesOrder.findMany();

    const counts = {
      'Pending Approval': 0,
      'Pending Logistics': 0,
      'Pending Invoice': 0,
      'Completed': 0,
      'Rejected': 0,
    };

    let totalOrderValue = 0;

    orders.forEach((order) => {
      if (counts[order.status] !== undefined) {
        counts[order.status] += 1;
      } else {
        counts[order.status] = 1;
      }
      totalOrderValue += (order.qty || 0) * (order.rate || 0);
    });

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        counts,
        totalOrderValue,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
