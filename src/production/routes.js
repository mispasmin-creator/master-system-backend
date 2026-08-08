const express = require('express');
const router = express.Router();

router.use('/orders', require('./orders/orders.routes'));
router.use('/job-cards', require('./job-cards/job-cards.routes'));
router.use('/actual-production', require('./actual-production/actual-production.routes'));
router.use('/qc-checkpoints', require('./qc-checkpoints/qc-checkpoints.routes'));
router.use('/costing', require('./costing/costing.routes'));
router.use('/sample-test', require('./sample-test/sample-test.routes'));
router.use('/pi-approval', require('./pi-approval/pi-approval.routes'));
router.use('/management-review', require('./management-review/management-review.routes'));
router.use('/full-kitting', require('./full-kitting/full-kitting.routes'));
router.use('/semi-production', require('./semi-production/semi-production.routes'));
router.use('/semi-job-card', require('./semi-production/semi-job-card.routes'));
router.use('/crushing', require('./crushing/crushing.routes'));
router.use('/kyc', require('./kyc/kyc.routes'));
router.use('/master', require('./master/master.routes'));
router.use('/production-tracking', require('./production-tracking/production-tracking.routes'));

module.exports = router;
