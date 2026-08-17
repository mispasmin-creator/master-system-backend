const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

/**
 * Calculates delay days between planned and actual date.
 * Ports the legacy formula from Make-Payment-Application/src/utils/helpers.js.
 * Defaults to 0 if negative or if plannedDate is missing.
 */
function calculateDelayDays(plannedDateInput, actualDateInput) {
  if (!plannedDateInput) return 0;
  
  const planned = new Date(plannedDateInput);
  const actual = actualDateInput ? new Date(actualDateInput) : new Date();
  
  if (isNaN(planned.getTime()) || isNaN(actual.getTime())) return 0;
  
  const diffTime = actual.getTime() - planned.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Generates the next sequential "AP-01" style payment number.
 * Ports the legacy sequential numbering logic from CreatePayment.jsx / helpers.js.
 */
async function generatePaymentNumber(customPrisma) {
  const client = customPrisma || prisma;
  const prefix = "AP-";
  
  const existing = await client.paymentRequest.findMany({
    where: {
      paymentNumber: { startsWith: prefix }
    },
    select: { paymentNumber: true }
  });

  let nextNum = 1;
  if (existing.length > 0) {
    const nums = existing.map(p => {
      const numPart = parseInt(p.paymentNumber.substring(prefix.length), 10);
      return isNaN(numPart) ? 0 : numPart;
    });
    nextNum = Math.max(...nums) + 1;
  }

  return `${prefix}${String(nextNum).padStart(2, '0')}`;
}

/**
 * Valid status transition map per Prompt 1 / payment-migration-notes.md.
 */
const ALLOWED_TRANSITIONS = {
  'Draft': ['Submitted', 'Yes', 'Approved for Funding', 'Rejected'],
  'No': ['Submitted', 'Yes', 'Approved for Funding', 'Rejected'],
  'Submitted': ['Approved for Funding', 'Draft', 'Rejected'],
  'Yes': ['Approved for Funding', 'Draft', 'Rejected'],
  'Approved for Funding': ['Channel Funded', 'Rejected'],
  'Channel Funded': ['Approved', 'Rejected'],
  'Approved': ['Posted', 'Rejected'],
  'Posted': ['Payment Completed', 'Rejected'],
  'Payment Completed': [],
  'Rejected': ['Draft', 'Submitted', 'Approved for Funding', 'Channel Funded', 'Approved', 'Posted']
};

/**
 * Resolves default history title from target status.
 */
function getHistoryTitle(newStatus) {
  switch (newStatus) {
    case 'Draft':
    case 'No':
      return 'Payment Draft Saved';
    case 'Submitted':
    case 'Yes':
      return 'Payment Request Created';
    case 'Approved for Funding':
      return 'Approved for Channel Funding';
    case 'Channel Funded':
      return 'Channel Funded';
    case 'Approved':
      return 'Payment Approved';
    case 'Posted':
      return 'Payment Posted';
    case 'Payment Completed':
      return 'Payment Completed';
    case 'Rejected':
      return 'Payment Rejected';
    default:
      return `Status Updated to ${newStatus}`;
  }
}

/**
 * Validates and executes a payment status transition, updates stage-specific fields,
 * and appends a relational PaymentHistoryEntry.
 *
 * @param {string} paymentIdOrNumber - ID or Payment Number of the target request.
 * @param {string} newStatus - Target status string.
 * @param {object|string} actorUser - User object ({ username, role, name }) or username string.
 * @param {string} [remarks] - User comments or remarks for the transition.
 * @param {object} [updateDetails] - Extra stage-specific field values.
 * @param {object} [customPrisma] - Optional Prisma client instance for transactions.
 */
async function transition(paymentIdOrNumber, newStatus, actorUser, remarks = '', updateDetails = {}, customPrisma) {
  const client = customPrisma || prisma;

  // 1. Locate the payment record by ID or paymentNumber
  const payment = await client.paymentRequest.findFirst({
    where: {
      OR: [
        { id: paymentIdOrNumber },
        { paymentNumber: paymentIdOrNumber }
      ]
    }
  });

  if (!payment) {
    throw new Error(`Payment request '${paymentIdOrNumber}' not found.`);
  }

  const currentStatus = payment.status || 'Draft';

  // 2. Validate legal transition rule
  if (currentStatus !== newStatus) {
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new Error(`Illegal status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedNext.join(', ')}`);
    }
  }

  // 3. Prepare updated data fields
  const now = new Date();
  const updateData = {
    status: newStatus
  };

  // Extract actor details
  const userName = typeof actorUser === 'object' ? (actorUser.name || actorUser.username || 'System') : (actorUser || 'System');
  const userRole = typeof actorUser === 'object' ? (actorUser.role || actorUser.Role || 'User') : 'User';

  // Stage-specific payload enrichment
  if (newStatus === 'Approved for Funding') {
    updateData.approvalStatus = 'Approved for Funding';
    updateData.checkerRemarks = remarks || updateDetails.checkerRemarks || payment.checkerRemarks;
  } else if (newStatus === 'Channel Funded') {
    if (updateDetails.typeOfFunding || updateDetails["Type of funding"]) {
      updateData.typeOfFunding = updateDetails.typeOfFunding || updateDetails["Type of funding"];
    }
    if (updateDetails.fundingChannel || updateDetails["Funding Channel"]) {
      updateData.fundingChannel = updateDetails.fundingChannel || updateDetails["Funding Channel"];
    }
    updateData.fundingRemarks = remarks || updateDetails.fundingRemarks || updateDetails["Funding Remarks"] || payment.fundingRemarks;
    updateData.fundingActual = updateDetails.fundingActual ? new Date(updateDetails.fundingActual) : now;
    updateData.fundingStatus = 'Channel Funded';
  } else if (newStatus === 'Approved') {
    updateData.approverRemarks = remarks || updateDetails.approverRemarks || payment.approverRemarks;
    updateData.approvalStatus = 'Approved';
    updateData.approvalActual = updateDetails.approvalActual ? new Date(updateDetails.approvalActual) : now;
    updateData.approvalStageStatus = 'Approved';
    updateData.approvalStageRemarks = remarks || updateDetails.approvalStageRemarks || payment.approvalStageRemarks;
  } else if (newStatus === 'Posted') {
    updateData.postingActual = updateDetails.postingActual ? new Date(updateDetails.postingActual) : now;
    updateData.postingRemarks = remarks || updateDetails.postingRemarks || updateDetails["Posting Remarks"] || payment.postingRemarks;
    updateData.postingDelay = calculateDelayDays(payment.postingPlanned || payment.plannedDate, now);
  } else if (newStatus === 'Payment Completed') {
    if (updateDetails.paymentMode || updateDetails["Payment Mode"]) {
      updateData.paymentMode = updateDetails.paymentMode || updateDetails["Payment Mode"];
    }
    updateData.finalActual = updateDetails.finalActual ? new Date(updateDetails.finalActual) : now;
    updateData.actualDate = updateData.finalActual;
    updateData.financeRemarks = remarks || updateDetails.financeRemarks || updateDetails["Finance Remarks"] || payment.financeRemarks;
    updateData.delayDays = calculateDelayDays(payment.plannedDate, now);
  } else if (newStatus === 'Rejected') {
    updateData.approvalStatus = 'Rejected';
    updateData.reason = remarks || updateDetails.reason || payment.reason;
  }

  // Include optional direct model attribute overrides if provided
  const directFields = [
    'fmsName', 'firmName', 'payTo', 'amount', 'department', 'priority',
    'remarks', 'attachmentUrl', 'supportingDocuments', 'maker', 'checker',
    'approver', 'plannedDate', 'requiredDate'
  ];
  directFields.forEach(field => {
    if (updateDetails[field] !== undefined) {
      updateData[field] = updateDetails[field];
    }
  });

  // 4. Update PaymentRequest and Create PaymentHistoryEntry in a transaction
  const [updatedPayment, historyEntry] = await client.$transaction([
    client.paymentRequest.update({
      where: { id: payment.id },
      data: updateData
    }),
    client.paymentHistoryEntry.create({
      data: {
        paymentId: payment.id,
        title: updateDetails.historyTitle || getHistoryTitle(newStatus),
        userName: userName,
        userRole: userRole,
        comment: remarks || updateDetails.comment || ''
      }
    })
  ]);

  return {
    payment: updatedPayment,
    history: historyEntry
  };
}

module.exports = {
  transition,
  calculateDelayDays,
  generatePaymentNumber,
  ALLOWED_TRANSITIONS
};
