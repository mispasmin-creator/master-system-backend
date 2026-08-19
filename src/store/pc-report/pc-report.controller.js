const { prisma } = require('../../config/db');

// @desc    Get live PC report aggregates
// @route   GET /api/store/pc-report
// @access  Private
const getPcReport = async (req, res, next) => {
  try {
    const indents = await prisma.storeIndent.findMany({
      include: {
        indentApproval: true,
        vendorQuotation: true,
        technicalApproval: true,
        managementApproval: true
      }
    });
    const lifts = await prisma.storeLift.findMany({
      include: { check: true, hodApproval: true }
    });

    const calculateCounts = (data, pendingFilter, completeFilter, stageName) => ({
      stage: stageName,
      totalPending: data.filter(pendingFilter).length,
      totalComplete: data.filter(completeFilter).length
    });

    const pcReports = [
      calculateCounts(
        indents,
        (item) => !item.indentApproval,
        (item) => !!item.indentApproval,
        'Department Indent Approval'
      ),
      calculateCounts(
        indents,
        (item) => !!item.indentApproval && !item.vendorQuotation,
        (item) => !!item.vendorQuotation,
        'Vendor Rate Update'
      ),
      calculateCounts(
        indents,
        (item) => !!item.vendorQuotation && !item.technicalApproval,
        (item) => !!item.technicalApproval,
        'Department Approval'
      ),
      calculateCounts(
        indents,
        (item) => !!item.technicalApproval && !item.managementApproval,
        (item) => !!item.managementApproval,
        'Management Approval'
      ),
      calculateCounts(
        indents,
        (item) =>
          item.vendorQuotation?.poRequired?.toString().trim() === 'Yes' &&
          (item.pendingPoQty || 0) > 0 &&
          !!item.managementApproval?.approvedVendorName?.toString().trim(),
        (item) =>
          item.vendorQuotation?.poRequired?.toString().trim() !== 'Yes' ||
          (item.pendingPoQty || 0) <= 0,
        'Pending PO'
      ),
      calculateCounts(
        indents,
        (item) => item.liftingStatus === 'Pending',
        (item) => item.liftingStatus === 'Complete',
        'Lifting'
      ),
      calculateCounts(
        lifts,
        (item) => !item.check,
        (item) => !!item.check,
        'Store Check'
      ),
      calculateCounts(
        lifts,
        (item) => !!item.check && !item.hodApproval,
        (item) => !!item.hodApproval,
        'HOD Check'
      )
    ];

    res.json({ success: true, data: pcReports });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPcReport };
