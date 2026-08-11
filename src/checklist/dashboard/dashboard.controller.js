const { prisma } = require('../../config/db');

// @desc    Get checklist dashboard stats
// @route   GET /api/checklist/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();

    const [total, completed, pending, overdue] = await Promise.all([
      prisma.checklistTask.count(),
      prisma.checklistTask.count({
        where: { status: { in: ['Completed', 'Verified'] } }
      }),
      prisma.checklistTask.count({
        where: { status: 'Pending' }
      }),
      prisma.checklistTask.count({
        where: { status: 'Pending', dueDate: { lt: now } }
      })
    ]);

    const [recentTasks, upcomingTasks, overdueTasks] = await Promise.all([
      prisma.checklistTask.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { department: true }
      }),
      prisma.checklistTask.findMany({
        where: { status: 'Pending', dueDate: { gte: now } },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: { department: true }
      }),
      prisma.checklistTask.findMany({
        where: { status: 'Pending', dueDate: { lt: now } },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: { department: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: { total, completed, pending, overdue },
        lists: { recentTasks, upcomingTasks, overdueTasks }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard summary grouped by department or staff
// @route   GET /api/checklist/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const { by } = req.query;
    
    if (by !== 'department' && by !== 'staff') {
      res.status(400);
      throw new Error('Query parameter "by" must be either "department" or "staff"');
    }

    const groupByField = by === 'department' ? 'departmentId' : 'assignedTo';
    
    const summary = await prisma.checklistTask.groupBy({
      by: [groupByField],
      _count: { _all: true }
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getDashboardSummary
};
