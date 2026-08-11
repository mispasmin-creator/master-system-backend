const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

/**
 * Calculates delay in days between planned date and actual date.
 * Returns positive integer if actual > planned, else 0.
 * Returns 0 if either date is missing or invalid.
 */
function calculateDelay(planned, actual) {
  if (!planned || !actual) return 0;
  const pDate = new Date(planned);
  const aDate = new Date(actual);
  if (isNaN(pDate.getTime()) || isNaN(aDate.getTime())) return 0;

  pDate.setHours(0, 0, 0, 0);
  aDate.setHours(0, 0, 0, 0);

  const diffTime = aDate.getTime() - pDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Derives overall RepairTask status.
 * Returns 'Complete' if actual4 is set or explicitly marked 'Complete', else 'Pending'.
 * Matches the logic in Repair-FMS where status AV col 47 is 'Complete' or 'Pending'.
 */
function deriveRepairStatus(task) {
  if (task.actual4 || (task.status && task.status.toLowerCase() === 'complete')) {
    return 'Complete';
  }
  return 'Pending';
}

/**
 * Generates sequential Task Number (e.g. TS-001, TS-002).
 */
async function generateTaskNo() {
  const count = await prisma.repairTask.count();
  return `TS-${String(count + 1).padStart(3, '0')}`;
}

/**
 * Creates a new RepairTask directly in the PostgreSQL database.
 * Serves as the single source of truth for task creation.
 */
async function createTask(fields = {}) {
  const taskNo = fields.taskNo || (await generateTaskNo());

  const payload = {
    taskNo: taskNo,
    firmName: fields.firmName || 'Pmmpl',
    serialNo: fields.serialNo || null,
    machineName: fields.machineName || null,
    machinePartName: fields.machinePartName || null,
    givenBy: fields.givenBy || null,
    doerName: fields.doerName || null,
    problem: fields.problem || fields.problemWithMachine || null,
    enableReminder: fields.enableReminder === true || fields.enableReminder === 'Yes',
    requireAttachment: fields.requireAttachment === true || fields.requireAttachment === 'Yes',
    taskStartDate: fields.taskStartDate ? new Date(fields.taskStartDate) : null,
    taskEndDate: fields.taskEndDate ? new Date(fields.taskEndDate) : null,
    priority: fields.priority || null,
    department: fields.department || null,
    location: fields.location || null,
    imageUrl: fields.imageUrl || fields.imageLink || null,
    status: fields.status || 'Pending'
  };

  const createdTask = await prisma.repairTask.create({
    data: payload
  });

  return createdTask;
}

/**
 * Advances or updates a RepairTask stage ('sent-to-vendor' | 'check-machine' | 'store-in' | 'make-payment' | 'accounts').
 * Updates stage dates, recalculates stage delay, and updates overall task status.
 */
async function advanceStage(taskId, stage, fields = {}) {
  // Find task by ID or taskNo
  const existingTask = await prisma.repairTask.findFirst({
    where: {
      OR: [{ id: taskId }, { taskNo: taskId }]
    }
  });

  if (!existingTask) {
    throw new Error(`RepairTask not found with ID or taskNo: ${taskId}`);
  }

  const updateData = {};

  if (stage === 'sent-to-vendor') {
    if (fields.planned !== undefined) updateData.planned = fields.planned ? new Date(fields.planned) : null;
    if (fields.actual !== undefined) updateData.actual = fields.actual ? new Date(fields.actual) : null;
    if (fields.vendorName !== undefined) updateData.vendorName = fields.vendorName;
    if (fields.leadTimeToDeliverDays !== undefined) updateData.leadTimeToDeliverDays = parseFloat(fields.leadTimeToDeliverDays) || null;
    if (fields.transporterName !== undefined) updateData.transporterName = fields.transporterName;
    if (fields.transportationCharges !== undefined) updateData.transportationCharges = parseFloat(fields.transportationCharges) || null;
    if (fields.weighmentSlip !== undefined) updateData.weighmentSlip = fields.weighmentSlip;
    if (fields.transportingImageWithMachine !== undefined) updateData.transportingImageWithMachine = fields.transportingImageWithMachine;
    if (fields.paymentType !== undefined) updateData.paymentType = fields.paymentType;
    if (fields.howMuch !== undefined) updateData.howMuch = parseFloat(fields.howMuch) || null;

    const effectivePlanned = updateData.planned !== undefined ? updateData.planned : existingTask.planned;
    const effectiveActual = updateData.actual !== undefined ? updateData.actual : existingTask.actual;
    updateData.delay = calculateDelay(effectivePlanned, effectiveActual);
  } else if (stage === 'check-machine') {
    if (fields.planned1 !== undefined) updateData.planned1 = fields.planned1 ? new Date(fields.planned1) : null;
    if (fields.actual1 !== undefined) updateData.actual1 = fields.actual1 ? new Date(fields.actual1) : null;
    if (fields.returnTransporterName !== undefined || fields.transporterName !== undefined) {
      updateData.returnTransporterName = fields.returnTransporterName || fields.transporterName;
    }
    if (fields.transportationAmount !== undefined) updateData.transportationAmount = parseFloat(fields.transportationAmount) || null;
    if (fields.billImage !== undefined) updateData.billImage = fields.billImage;
    if (fields.billNo !== undefined) updateData.billNo = fields.billNo;
    if (fields.typeOfBill !== undefined) updateData.typeOfBill = fields.typeOfBill;
    if (fields.totalBillAmount !== undefined) updateData.totalBillAmount = parseFloat(fields.totalBillAmount) || null;
    if (fields.toBePaidAmount !== undefined) updateData.toBePaidAmount = parseFloat(fields.toBePaidAmount) || null;
  } else if (stage === 'store-in') {
    if (fields.planned2 !== undefined) updateData.planned2 = fields.planned2 ? new Date(fields.planned2) : null;
    if (fields.actual2 !== undefined) updateData.actual2 = fields.actual2 ? new Date(fields.actual2) : null;
    if (fields.receivedQuantity !== undefined) updateData.receivedQuantity = parseFloat(fields.receivedQuantity) || null;
    if (fields.billMatch !== undefined) updateData.billMatch = fields.billMatch;
    if (fields.productImage !== undefined) updateData.productImage = fields.productImage;
    if (fields.billImage !== undefined) updateData.billImage = fields.billImage;
    if (fields.billNo !== undefined) updateData.billNo = fields.billNo;

    const effectivePlanned2 = updateData.planned2 !== undefined ? updateData.planned2 : existingTask.planned2;
    const effectiveActual2 = updateData.actual2 !== undefined ? updateData.actual2 : existingTask.actual2;
    updateData.delay2 = calculateDelay(effectivePlanned2, effectiveActual2);
  } else if (stage === 'make-payment') {
    if (fields.planned4 !== undefined) updateData.planned4 = fields.planned4 ? new Date(fields.planned4) : null;
    if (fields.actual4 !== undefined) updateData.actual4 = fields.actual4 ? new Date(fields.actual4) : null;
  } else if (stage === 'accounts') {
    if (fields.planned3 !== undefined) updateData.planned3 = fields.planned3 ? new Date(fields.planned3) : null;
    if (fields.actual3 !== undefined) updateData.actual3 = fields.actual3 ? new Date(fields.actual3) : null;
    if (fields.status1 !== undefined) updateData.status1 = fields.status1;
    if (fields.remarks1 !== undefined) updateData.remarks1 = fields.remarks1;
    if (fields.status2 !== undefined) updateData.status2 = fields.status2;
    if (fields.remarks2 !== undefined) updateData.remarks2 = fields.remarks2;
    if (fields.status3 !== undefined) updateData.status3 = fields.status3;
    if (fields.remarks3 !== undefined) updateData.remarks3 = fields.remarks3;
    if (fields.status4 !== undefined) updateData.status4 = fields.status4;
    if (fields.remarks4 !== undefined) updateData.remarks4 = fields.remarks4;

    const effectivePlanned3 = updateData.planned3 !== undefined ? updateData.planned3 : existingTask.planned3;
    const effectiveActual3 = updateData.actual3 !== undefined ? updateData.actual3 : existingTask.actual3;
    updateData.delay3 = calculateDelay(effectivePlanned3, effectiveActual3);
  }

  // Also accept general root field updates if provided
  if (fields.status !== undefined) {
    updateData.status = fields.status;
  } else {
    const mergedTaskState = { ...existingTask, ...updateData };
    updateData.status = deriveRepairStatus(mergedTaskState);
  }

  const updatedTask = await prisma.repairTask.update({
    where: { id: existingTask.id },
    data: updateData
  });

  return updatedTask;
}

module.exports = {
  calculateDelay,
  deriveRepairStatus,
  generateTaskNo,
  createTask,
  advanceStage
};
