const workflowService = require('../shared/paymentWorkflow.service');

/**
 * POST /api/payment/requests/:id/post
 * Confirm posting or reject payment request at posting stage
 */
exports.handlePosting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const targetStatus = body.status || body.Status || (body.isRejection ? 'Rejected' : 'Posted');
    const actorUser = req.user || body.actorUser || body.user || body.userName || 'Accounts User';
    const remarks = body.remarks || body.Remarks || body.postingRemarks || body["Posting Remarks"] || '';

    const updateDetails = {
      postingRemarks: remarks,
      postingActual: body.postingActual ? new Date(body.postingActual) : new Date(),
      historyTitle: targetStatus === 'Rejected' ? 'Payment Rejection (Posting Stage)' : 'Payment Posted'
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
