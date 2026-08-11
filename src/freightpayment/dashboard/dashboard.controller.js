const { prisma } = require('../../config/db');

// @desc    Get Freight Payment dashboard summary metrics
// @route   GET /api/freightpayment/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const entries = await prisma.freightPaymentEntry.findMany({
      include: {
        kitting: true,
        audit: true,
        posting: true,
        release: true,
      },
    });

    const msInDay = 1000 * 60 * 60 * 24;

    let pendingKitting = 0;
    let pendingAudit = 0;
    let pendingPosting = 0;
    let pendingRelease = 0;
    let completed = 0;

    let delayedKitting = 0;
    let delayedAudit = 0;
    let delayedPosting = 0;
    let delayedRelease = 0;

    entries.forEach((e) => {
      const kitting = e.kitting;
      const audit = e.audit;
      const posting = e.posting;
      const release = e.release;

      let currentStage = 'Kitting';
      if (!kitting || kitting.status !== 'Done') {
        currentStage = 'Kitting';
        pendingKitting += 1;
      } else if (!audit || audit.status !== 'Done') {
        currentStage = 'Audit';
        pendingAudit += 1;
      } else if (!posting || posting.status !== 'Done') {
        currentStage = 'Posting';
        pendingPosting += 1;
      } else if (!release || release.status !== 'Done') {
        currentStage = 'Release';
        pendingRelease += 1;
      } else {
        currentStage = 'Completed';
        completed += 1;
      }

      // Check delay at each stage
      if (audit && audit.actualAt && e.plannedAt) {
        const diffMs = new Date(audit.actualAt).getTime() - new Date(e.plannedAt).getTime();
        if (diffMs > msInDay) delayedAudit += 1;
      }

      if (posting && posting.actualAt && kitting && kitting.nextPlannedAt) {
        const diffMs = new Date(posting.actualAt).getTime() - new Date(kitting.nextPlannedAt).getTime();
        if (diffMs > msInDay) delayedPosting += 1;
      }

      if (release && release.actualAt && posting && posting.actualAt) {
        const diffMs = new Date(release.actualAt).getTime() - new Date(posting.actualAt).getTime();
        if (diffMs > msInDay) delayedRelease += 1;
      }
    });

    res.json({
      success: true,
      data: {
        totalEntries: entries.length,
        pendingKitting,
        pendingAudit,
        pendingPosting,
        pendingRelease,
        completed,
        delayedKitting,
        delayedAudit,
        delayedPosting,
        delayedRelease,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
