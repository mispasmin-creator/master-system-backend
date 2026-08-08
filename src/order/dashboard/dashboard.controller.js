const { prisma } = require('../../config/db');

// @desc    Order system KPI dashboard — read-only aggregates across the
//          whole pipeline (no dedicated SQL views, computed here instead of
//          client-side like the reference app's Dashboard.jsx did).
// @route   GET /api/order/dashboard
// @access  Public
const getDashboard = async (req, res, next) => {
  try {
    const [receipts, dispatches, deliveries, materialReceipts, piRecords, retentionRecords] = await Promise.all([
      prisma.orderReceipt.findMany(),
      prisma.orderDispatch.findMany(),
      prisma.orderDelivery.findMany(),
      prisma.orderMaterialReceipt.findMany(),
      prisma.orderPiRecord.findMany(),
      prisma.orderRetentionRecord.findMany(),
    ]);

    const totalOrderQty = receipts.reduce((s, r) => s + (r.quantity || 0), 0);
    const totalDelivered = receipts.reduce((s, r) => s + (r.delivered || 0), 0);
    const totalPendingQty = receipts.reduce((s, r) => s + (r.pendingQty || 0), 0);

    const statusBreakdown = receipts.reduce((acc, r) => {
      const status = r.logisticsStatus === 'Order Cancelled' ? 'Cancelled' : (r.status || 'Unknown');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const piPending = piRecords.filter((p) => p.status !== 'Received');
    const piPendingAmount = piPending.reduce((s, p) => s + Math.max(0, (p.expectedAmount || 0) - (p.actualAmount || 0)), 0);
    const piReceivedAmount = piRecords.reduce((s, p) => s + (p.actualAmount || 0), 0);

    const retentionPendingAmount = retentionRecords
      .filter((r) => r.status !== 'Paid')
      .reduce((s, r) => s + Math.max(0, (r.amountReceived || 0)), 0);

    const totalBillAmount = materialReceipts.reduce((s, m) => s + (m.totalBillAmount || 0), 0);

    res.json({
      success: true,
      data: {
        ordersCount: receipts.length,
        totalOrderQty,
        totalDelivered,
        totalPendingQty,
        dispatchesCount: dispatches.length,
        deliveriesCount: deliveries.length,
        statusBreakdown,
        pi: {
          totalRecords: piRecords.length,
          pendingCount: piPending.length,
          pendingAmount: piPendingAmount,
          receivedAmount: piReceivedAmount,
        },
        retention: {
          totalRecords: retentionRecords.length,
          pendingAmount: retentionPendingAmount,
        },
        totalBillAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cross-pipeline "how many rows are waiting at each stage" overview
//          — the process/workflow dashboard.
// @route   GET /api/order/process-dashboard
// @access  Public
const getProcessDashboard = async (req, res, next) => {
  try {
    const [
      pendingCheckPo, pendingReceivedAccounts, pendingCheckDelivery,
      pendingArrangeLogistics, pendingLogisticsApproval,
      pendingAccountsApproval, pendingLogistic, pendingLoadMaterial,
      pendingWetmanEntry, pendingInvoice, pendingFullkitting, pendingTc,
      pendingBiltyUpdate, pendingCrm,
      pendingMaterialReturnApproval, pendingMaterialReturnDebitNote, pendingMaterialReturnDispatch,
    ] = await Promise.all([
      prisma.orderReceipt.count({ where: { checkPo: null } }),
      prisma.orderReceipt.count({ where: { checkPo: { isNot: null }, receivedAccounts: null } }),
      prisma.orderReceipt.count({ where: { receivedAccounts: { isNot: null }, checkDelivery: null } }),
      prisma.orderReceipt.count({
        where: {
          receivedAccounts: { isNot: null }, checkDelivery: { isNot: null },
          OR: [{ logisticsStatus: null }, { logisticsStatus: 'Pending Arrangement' }],
        },
      }),
      prisma.orderReceipt.count({ where: { logisticsStatus: 'Pending Approval' } }),
      prisma.orderLogisticsSplit.count({ where: { status: 'Dispatched' } }),
      prisma.orderDispatch.count({ where: { logistic: null } }),
      prisma.orderDispatch.count({ where: { logistic: { isNot: null }, loadMaterial: null } }),
      prisma.orderDispatch.count({ where: { loadMaterial: { isNot: null }, wetmanEntry: null } }),
      prisma.orderDispatch.count({ where: { wetmanEntry: { isNot: null }, invoice: null } }),
      prisma.orderDispatch.count({ where: { invoice: { isNot: null }, fullkitting: null } }),
      prisma.orderDispatch.count({ where: { invoice: { isNot: null }, tcRequired: 'Yes', deliveries: { none: {} } } }),
      prisma.orderDelivery.count({ where: { bilty: null } }),
      prisma.orderDelivery.count({ where: { bilty: { isNot: null }, crm: null } }),
      prisma.orderMaterialReturn.count({ where: { managementApproval: null } }),
      prisma.orderMaterialReturn.count({ where: { managementApproval: { managementStatus: 'Approved' }, debitNote: null } }),
      prisma.orderMaterialReturn.count({
        where: { managementApproval: { managementStatus: 'Approved' }, debitNote: { isNot: null }, returnDispatch: null },
      }),
    ]);

    res.json({
      success: true,
      data: {
        pendingCheckPo,
        pendingReceivedAccounts,
        pendingCheckDelivery,
        pendingArrangeLogistics,
        pendingLogisticsApproval,
        pendingAccountsApproval,
        pendingLogistic,
        pendingLoadMaterial,
        pendingWetmanEntry,
        pendingInvoice,
        pendingFullkitting,
        pendingTc,
        pendingBiltyUpdate,
        pendingCrm,
        pendingMaterialReturnApproval,
        pendingMaterialReturnDebitNote,
        pendingMaterialReturnDispatch,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getProcessDashboard };
