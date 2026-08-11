const workflowService = require('../shared/paymentWorkflow.service');

/**
 * POST /api/payment/requests/:id/approve
 * Approve or reject payment request at approval audit stage
 */
exports.handleApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const targetStatus = body.status || body.Status || (body.isRejection ? 'Rejected' : 'Approved');
    const actorUser = req.user || body.actorUser || body.user || body.userName || 'Approver User';
    const comment = body.comment || body.approverRemarks || body.Remarks || body["Approver Remarks"] || '';

    const updateDetails = {
      approverRemarks: comment,
      approvalStageRemarks: comment,
      historyTitle: targetStatus === 'Rejected' ? 'Payment Rejection (Approval Stage)' : 'Payment Approved'
    };

    const result = await workflowService.transition(
      id,
      targetStatus,
      actorUser,
      comment,
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
