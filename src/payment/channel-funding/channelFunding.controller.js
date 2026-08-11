const workflowService = require('../shared/paymentWorkflow.service');

/**
 * POST /api/payment/requests/:id/channel-funding
 * Confirm channel funding or reject request at channel funding stage
 */
exports.handleChannelFunding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const targetStatus = body.status || body.Status || (body.isRejection ? 'Rejected' : 'Channel Funded');
    const actorUser = req.user || body.actorUser || body.user || body.userName || 'Finance User';
    const remarks = body.remarks || body.Remarks || body.fundingRemarks || body["Funding Remarks"] || '';

    const updateDetails = {
      typeOfFunding: body.typeOfFunding || body["Type of funding"],
      fundingChannel: body.fundingChannel || body["Funding Channel"] || body.typeOfFunding,
      fundingRemarks: remarks,
      fundingActual: body.fundingActual ? new Date(body.fundingActual) : new Date(),
      historyTitle: targetStatus === 'Rejected' ? 'Channel Funding Rejected' : 'Channel Funded'
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
