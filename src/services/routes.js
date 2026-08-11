const express = require('express');
const router = express.Router();

const offerRoutes = require('./offers/offer.routes');
const jobRoutes = require('./jobs/job.routes');
const billRoutes = require('./bills/bill.routes');
const tallyRoutes = require('./tally/tally.routes');
const utilityRoutes = require('./utility/utility.routes');
const reportsRoutes = require('./reports/reports.routes');
const masterRoutes = require('./master/master.routes');
const settingsRoutes = require('./master/settings.routes');

router.use('/offers', offerRoutes);
router.use('/jobs', jobRoutes);
router.use('/bills', billRoutes);
router.use('/tally', tallyRoutes);
router.use('/utility', utilityRoutes);
router.use('/reports', reportsRoutes);
router.use('/master', masterRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
