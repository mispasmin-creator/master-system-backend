const workflowService = require('../shared/paymentWorkflow.service');

/**
 * POST /api/payment/requests/:id/pay
 * Complete final payment disbursement or reject payment request at final stage
 */
exports.handleFinalPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const targetStatus = body.status || body.Status || (body.isRejection ? 'Rejected' : 'Payment Completed');
    const actorUser = req.user || body.actorUser || body.user || body.userName || 'Finance Disburser';
    const remarks = body.remarks || body.Remarks || body.financeRemarks || body["Finance Remarks"] || '';

    const updateDetails = {
      paymentMode: body.paymentMode || body["Payment Mode"] || 'NEFT',
      financeRemarks: remarks,
      finalActual: body.finalActual ? new Date(body.finalActual) : new Date(),
      historyTitle: targetStatus === 'Rejected' ? 'Payment Rejection (Final Stage)' : `Payment Completed (${body.paymentMode || 'NEFT'})`
    };

    const result = await workflowService.transition(
      id,
      targetStatus,
      actorUser,
      remarks,
      updateDetails
    );

    res.json({
      success: true,
      data: result.payment,
      history: result.history
    });
  } catch (error) {
    next(error);
  }
};
