const { prisma } = require('../../config/db');

// @desc    Get live PC report aggregates
// @route   GET /api/refrasynth/pc-report
// @access  Private
const getPcReport = async (req, res, next) => {
  try {
    const indents = await prisma.refrasynthIndent.findMany();
    const storeIns = await prisma.refrasynthStoreIn.findMany();

    const calculateCounts = (data, pendingFilter, completeFilter, stageName) => {
      return {
        stage: stageName,
        totalPending: data.filter(pendingFilter).length,
        totalComplete: data.filter(completeFilter).length,
      };
    };

    const pcReports = [
      calculateCounts(
        indents,
        (item) => item.planned1 && !item.actual1,
        (item) => !!item.actual1,
        'Department Indent Approval'
      ),
      calculateCounts(
        indents,
        (item) => item.planned2 && !item.actual2,
        (item) => !!item.actual2,
        'Vendor Rate Update'
      ),
      calculateCounts(
        indents,
        (item) => item.planned3 && !item.actual3,
        (item) => !!item.actual3,
        'Department Approval'
      ),
      calculateCounts(
        indents,
        (item) => item.planned4 && !item.actual4,
        (item) => !!item.actual4,
        'Management Approval'
      ),
      calculateCounts(
        indents,
        (item) =>
          item.poRequired &&
          item.poRequired.toString().trim() === 'Yes' &&
          item.pendingPoQty &&
          item.pendingPoQty > 0 &&
          item.approvedVendorName &&
          item.approvedVendorName.toString().trim() !== '',
        (item) => !item.poRequired || item.poRequired !== 'Yes' || (item.pendingPoQty || 0) <= 0,
        'Pending PO'
      ),
      calculateCounts(
        indents,
        (item) => (item.liftingStatus === 'Pending') && item.planned5 && !item.actual5,
        (item) => !!item.actual5,
        'Lifting'
      ),
      calculateCounts(
        storeIns,
        (item) => item.planned6 && !item.actual6,
        (item) => !!item.actual6,
        'Store Check'
      ),
      calculateCounts(
        storeIns,
        (item) => item.plannedHod && !item.actualHod,
        (item) => !!item.actualHod,
        'HOD Check'
      )
    ];

    res.json({ success: true, data: pcReports });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPcReport };
