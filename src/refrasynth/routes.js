const express = require('express');
const router = express.Router();

router.use('/master', require('./master/master.routes'));
router.use('/user', require('./user/user.routes'));
router.use('/indent', require('./indent/indent.routes'));
router.use('/po-master', require('./po-master/po-master.routes'));
router.use('/store-in', require('./store-in/store-in.routes'));
router.use('/payment', require('./payment/payment.routes'));
router.use('/issue', require('./issue/issue.routes'));
router.use('/inventory', require('./inventory/inventory.routes'));
router.use('/tally-entry', require('./tally-entry/tally-entry.routes'));
router.use('/fullkitting', require('./fullkitting/fullkitting.routes'));
router.use('/pc-report', require('./pc-report/pc-report.routes'));
router.use('/payment-history', require('./payment-history/payment-history.routes'));

module.exports = router;
