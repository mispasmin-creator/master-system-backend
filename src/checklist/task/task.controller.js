const { prisma } = require('../../config/db');

// @desc    Get all checklist tasks
// @route   GET /api/checklist/task
// @access  Public
const getAllTasks = async (req, res, next) => {
  try {
    const data = await prisma.checklistTask.findMany({
      include: {
        department: true,
        template: true
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch create tasks with template and recurrence
// @route   POST /api/checklist/task/batch
// @access  Private
const batchCreateTasks = async (req, res, next) => {
  try {
    const { 
      taskType, 
      departmentId, 
      givenBy, 
      assignedTo, 
      description, 
      frequency, 
      startDate, 
      workingDaysConfig, 
      enableReminders, 
      requireAttachment, 
      occurrences 
    } = req.body;

    if (!occurrences || !Array.isArray(occurrences) || occurrences.length === 0) {
      res.status(400);
      throw new Error('occurrences array is required and must not be empty');
    }

    const result = await prisma.$transaction(async (tx) => {
      let startSeq = 0;

      // 1. Fetch department lastTaskSeq if applicable
      if (taskType !== 'delegation' && departmentId) {
        const dept = await tx.checklistDepartment.findUnique({ 
          where: { id: departmentId } 
        });
        if (!dept) throw new Error('Department not found');
        startSeq = dept.lastTaskSeq || 0;
      }

      // 2. Prepare task payload
      const tasksToCreate = occurrences.map((occ, index) => {
        return {
          taskSeq: taskType !== 'delegation' && departmentId ? startSeq + index + 1 : null,
          taskType: taskType || 'checklist',
          departmentId: departmentId || null,
          givenBy,
          assignedTo,
          description,
          frequency,
          dueDate: new Date(occ.dueDate),
          enableReminders: enableReminders !== undefined ? enableReminders : true,
          requireAttachment: requireAttachment || false,
          status: 'Pending',
        };
      });

      // 3. Create Template + Nested Tasks
      const template = await tx.checklistTaskTemplate.create({
        data: {
          taskType: taskType || 'checklist',
          departmentId: departmentId || null,
          givenBy,
          assignedTo,
          description,
          frequency,
          startDate: startDate ? new Date(startDate) : null,
          workingDaysConfig: workingDaysConfig || null,
          enableReminders: enableReminders !== undefined ? enableReminders : true,
          requireAttachment: requireAttachment || false,
          tasks: {
            create: tasksToCreate
          }
        },
        include: {
          tasks: true
        }
      });

      // 4. Update department sequence counter
      if (taskType !== 'delegation' && departmentId && tasksToCreate.length > 0) {
        await tx.checklistDepartment.update({
          where: { id: departmentId },
          data: { lastTaskSeq: startSeq + tasksToCreate.length }
        });
      }

      return template;
    });

    const { tasks, ...templateInfo } = result;

    res.status(201).json({ 
      success: true, 
      data: { 
        template: templateInfo, 
        tasks 
      } 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete a task
// @route   PATCH /api/checklist/task/:id/complete
// @access  Private
const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks, attachmentUrl, completedBy } = req.body;

    const task = await prisma.checklistTask.findUnique({
      where: { id }
    });

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    if (task.requireAttachment && !attachmentUrl) {
      res.status(400);
      throw new Error('Attachment is required to complete this task');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.checklistTask.update({
        where: { id },
        data: {
          status: status || 'Completed',
          completedAt: new Date(),
          completedBy,
          remarks,
          attachmentUrl
        }
      });

      const history = await tx.checklistTaskHistory.create({
        data: {
          taskId: id,
          action: 'Completed',
          statusFrom: task.status,
          statusTo: status || 'Completed',
          remarks,
          attachmentUrl,
          actor: completedBy
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
  getAllTasks,
  batchCreateTasks,
  completeTask,
};
