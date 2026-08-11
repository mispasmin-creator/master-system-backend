const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { advanceStage } = require('../shared/repairWorkflow.service');

// GET /api/repair/accounts?firm=&search=
const getAccountsData = async (req, res) => {
  try {
    const { firm, search } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }

    if (search) {
      where.OR = [
        { taskNo: { contains: search, mode: 'insensitive' } },
        { machineName: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } }
      ];
    }

    const tasks = await prisma.repairTask.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Format tasks into the 4-step structure expected by Accounts.jsx
    const formatted = tasks.map((task) => ({
      id: task.id,
      timestamp: task.createdAt,
      taskNo: task.taskNo,
      firmName: task.firmName,
      serialNo: task.serialNo,
      machineName: task.machineName,
      machinePartName: task.machinePartName,
      department: task.department,
      location: task.location,
      steps: {
        audit: {
          planned: task.planned1,
          actual: task.actual1,
          delay: task.delay1,
          status: task.status1 || 'Pending',
          remarks: task.remarks1
        },
        rectify: {
          planned: task.planned2,
          actual: task.actual2,
          delay: task.delay2,
          status: task.status2 || 'Pending',
          remarks: task.remarks2
        },
        reaudit: {
          planned: task.planned3,
          actual: task.actual3,
          delay: task.delay3,
          status: task.status3 || 'Pending',
          remarks: task.remarks3
        },
        tally: {
          planned: task.planned4,
          actual: task.actual4,
          delay: task.delay4,
          status: task.status4 || 'Pending',
          remarks: task.remarks4
        }
      }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('getAccountsData error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/repair/accounts/:id (update accounts audit step)
const updateAccountsAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body; // { step: 'audit'|'rectify'|'reaudit'|'tally', status, remarks, actualDate }

    const stepKey = body.step || 'audit';
    const actualDate = body.actualDate || body.actual || new Date();

    const updateFields = {};
    if (stepKey === 'audit' || body['Actual 1'] !== undefined) {
      updateFields.actual1 = actualDate;
      updateFields.status1 = body.status || body['Status 1'] || 'Complete';
      updateFields.remarks1 = body.remarks || body['Remarks1'] || null;
    } else if (stepKey === 'rectify' || body['Actual 2'] !== undefined) {
      updateFields.actual2 = actualDate;
      updateFields.status2 = body.status || body['Status 2'] || 'Complete';
      updateFields.remarks2 = body.remarks || body['Remarks 2'] || null;
    } else if (stepKey === 'reaudit' || body['Actual 3'] !== undefined) {
      updateFields.actual3 = actualDate;
      updateFields.status3 = body.status || body['Status 3'] || 'Complete';
      updateFields.remarks3 = body.remarks || body['Remarks 3'] || null;
    } else if (stepKey === 'tally' || body['Actual 4'] !== undefined) {
      updateFields.actual4 = actualDate;
      updateFields.status4 = body.status || body['Status 4'] || 'Complete';
      updateFields.remarks4 = body.remarks || body['Remarks 4'] || null;
    }

    const task = await advanceStage(id, 'accounts', updateFields);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error('updateAccountsAudit error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAccountsData,
  updateAccountsAudit
};
