const { prisma } = require('../../config/db');
const { generateTaskOccurrences } = require('./task-template.service');

// @desc    Get all checklist task templates
// @route   GET /api/checklist/task-template
// @access  Public
const getAllTaskTemplates = async (req, res, next) => {
  try {
    const data = await prisma.checklistTaskTemplate.findMany({
      include: {
        department: true
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview task occurrences based on frequency and working days config
// @route   POST /api/checklist/task-template/preview
// @access  Private
const previewTasks = async (req, res, next) => {
  try {
    const { frequency, startDate, workingDaysConfig, endDate, department, givenBy, assignedTo, description } = req.body;
    
    if (!frequency || !startDate || !workingDaysConfig) {
      res.status(400);
      throw new Error('frequency, startDate, and workingDaysConfig are required');
    }

    const occurrences = generateTaskOccurrences({
      frequency,
      startDate,
      workingDaysConfig,
      endDate
    });

    const preview = occurrences.map(occ => ({
      description,
      department,
      givenBy,
      assignedTo,
      dueDate: occ.dueDate,
      frequency
    }));

    res.json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTaskTemplates,
  previewTasks,
};
