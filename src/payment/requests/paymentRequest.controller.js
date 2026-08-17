const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const workflowService = require('../shared/paymentWorkflow.service');

/**
 * GET /api/payment/requests
 * List payments with optional filters (stage, status, firm, search)
 */
exports.getAllRequests = async (req, res, next) => {
  try {
    const { stage, status, firm, search } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    } else if (stage) {
      if (stage === 'creation') {
        where.status = { in: ['Draft', 'No', 'Submitted', 'Yes'] };
      } else if (stage === 'channel-funding') {
        where.status = 'Approved for Funding';
      } else if (stage === 'approval') {
        where.status = 'Channel Funded';
      } else if (stage === 'posting') {
        where.status = 'Approved';
      } else if (stage === 'make-payment') {
        where.status = 'Posted';
      } else if (stage === 'completed') {
        where.status = 'Payment Completed';
      } else if (stage === 'rejected') {
        where.status = 'Rejected';
      }
    }

    if (firm && firm !== 'All') {
      where.firmName = { contains: firm, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { paymentNumber: { contains: q, mode: 'insensitive' } },
        { payTo: { contains: q, mode: 'insensitive' } },
        { fmsName: { contains: q, mode: 'insensitive' } },
        { uniqueNumber: { contains: q, mode: 'insensitive' } },
        { firmName: { contains: q, mode: 'insensitive' } }
      ];
    }

    const requests = await prisma.paymentRequest.findMany({
      where,
      include: {
        history: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/requests/:id
 * Get single payment request by ID or Payment Number
 */
exports.getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.paymentRequest.findFirst({
      where: {
        OR: [
          { id: id },
          { paymentNumber: id }
        ]
      },
      include: {
        history: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Payment request not found.' });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/requests
 * Create new payment request (Payment Creation page)
 */
exports.createRequest = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Generate payment number if not provided
    const paymentNumber = body.paymentNumber || body["Payment Number"] || await workflowService.generatePaymentNumber();
    const initialStatus = body.status || body.Status || 'Submitted';

    const requiredDate = body.requiredDate || body["Required Date"]
      ? new Date(body.requiredDate || body["Required Date"])
      : null;
    const plannedDate = body.plannedDate || body["Planned Date"]
      ? new Date(body.plannedDate || body["Planned Date"])
      : requiredDate;

    const payload = {
      paymentNumber,
      status: initialStatus,
      uniqueNumber: body.uniqueNumber || body["Unique Number"] || Math.random().toString(36).substring(2, 15),
      fmsName: body.fmsName || body["FMS Name"] || 'General',
      firmName: body.firmName || body["Firm Name"] || 'PMMPL',
      payTo: body.payTo || body["Pay To"] || '',
      amount: parseFloat(body.amount || body.Amount || 0),
      department: body.department || body.Department || 'IT',
      priority: body.priority || body.Priority || 'Medium',
      remarks: body.remarks || body.Remarks || '',
      attachmentUrl: body.attachmentUrl || body["Attachment URL"] || '',
      supportingDocuments: body.supportingDocuments || body["Supporting Documents"] || 'Invoice',
      maker: body.maker || body.Maker || (req.user?.name || req.user?.username || 'Maker'),
      checker: body.checker || body.Checker || 'Sarah Checker',
      approver: body.approver || body.Approver || '',
      plannedDate,
      requiredDate,
      createdBy: req.user?.username || body.createdBy || body["Created By"] || 'maker'
    };

    // Create payment request with initial history entry in a transaction
    const newRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentRequest.create({
        data: payload
      });

      const historyTitle = initialStatus === 'Draft' ? 'Payment Request Created as Draft' : 'Payment Request Created';
      await tx.paymentHistoryEntry.create({
        data: {
          paymentId: created.id,
          title: historyTitle,
          userName: payload.maker,
          userRole: 'Maker',
          comment: payload.remarks || 'Initial creation'
        }
      });

      return created;
    });

    const fullRecord = await prisma.paymentRequest.findUnique({
      where: { id: newRequest.id },
      include: { history: true }
    });

    res.status(201).json({
      success: true,
      data: fullRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/payment/requests/:id
 * Delete payment request
 */
exports.deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.paymentRequest.findFirst({
      where: {
        OR: [
          { id: id },
          { paymentNumber: id }
        ]
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payment request not found.' });
    }

    await prisma.paymentRequest.delete({
      where: { id: existing.id }
    });

    res.json({
      success: true,
      message: `Payment request '${existing.paymentNumber}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/requests/:id/action
 * Handle Checker Action (Approval for Funding or Reject) on Payment Request
 */
exports.handleAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const targetStatus = body.status || body.Status || (body.isRejection ? 'Rejected' : 'Approved for Funding');
    const actorUser = req.user || body.actorUser || body.user || body.userName || 'Checker User';
    const remarks = body.remarks || body.Remarks || body.checkerRemarks || body.comment || '';

    const updateDetails = {
      checkerRemarks: remarks,
      approvalStatus: targetStatus === 'Rejected' ? 'Rejected' : 'Approved for Funding',
      historyTitle: targetStatus === 'Rejected' ? 'Payment Request Rejected' : 'Approved for Channel Funding'
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

