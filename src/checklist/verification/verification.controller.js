const { prisma } = require('../../config/db');

// @desc    Get all checklist tasks pending verification
// @route   GET /api/checklist/verification
// @access  Private
const listPendingVerification = async (req, res, next) => {
  try {
    const { departmentId, assignedTo } = req.query;
    
    const whereClause = {
      status: 'Completed',
      verificationStatus: null,
    };

    if (departmentId) whereClause.departmentId = departmentId;
    if (assignedTo) whereClause.assignedTo = assignedTo;

    const data = await prisma.checklistTask.findMany({
      where: whereClause,
      orderBy: {
        completedAt: 'asc'
      },
      include: {
        department: true
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify or reopen a completed task
// @route   PATCH /api/checklist/verification/:id/verify
// @access  Private
const verifyTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks, verifiedBy } = req.body;

    if (!remarks || remarks.trim() === '') {
      res.status(400);
      throw new Error('Remarks are required for this action');
    }

    if (action !== 'verify' && action !== 'reopen') {
      res.status(400);
      throw new Error('Action must be either "verify" or "reopen"');
    }

    const task = await prisma.checklistTask.findUnique({
      where: { id }
    });

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      let updateData = {};
      
      if (action === 'verify') {
        updateData = {
          verificationStatus: 'Verified',
          verifiedBy,
          verifiedAt: new Date(),
          verificationRemarks: remarks,
          status: 'Verified'
        };
      } else if (action === 'reopen') {
        updateData = {
          status: 'Pending',
          verificationStatus: 'Reopened',
          completedAt: null,
          completedBy: null,
          remarks: null,
          attachmentUrl: null
        };
      }

      const updatedTask = await tx.checklistTask.update({
        where: { id },
        data: updateData
      });

      const history = await tx.checklistTaskHistory.create({
        data: {
          taskId: id,
          action: action === 'verify' ? 'Verified' : 'Reopened',
          statusFrom: task.status,
          statusTo: updateData.status,
          remarks,
          actor: verifiedBy
        }
      });

      return { task: updatedTask, history };
    });

    res.json({ success: true, data: result.task });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPendingVerification,
  verifyTask
};
