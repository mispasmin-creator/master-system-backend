const express = require('express');
const router = express.Router();

router.use('/master', require('./master/master.routes'));
router.use('/user', require('./user/user.routes'));

// Indent pipeline
router.use('/indent', require('./indent/indent.routes'));
router.use('/indent-approval', require('./indent-approval/indent-approval.routes'));
router.use('/vendor-quotation', require('./vendor-quotation/vendor-quotation.routes'));
router.use('/technical-approval', require('./technical-approval/technical-approval.routes'));
router.use('/management-approval', require('./management-approval/management-approval.routes'));
router.use('/po-master', require('./po-master/po-master.routes'));

// Lift pipeline
router.use('/lift', require('./lift/lift.routes'));
router.use('/check', require('./check/check.routes'));
router.use('/lift-hod-approval', require('./lift-hod-approval/lift-hod-approval.routes'));
router.use('/reject-grn', require('./reject-grn/reject-grn.routes'));
router.use('/debit-note', require('./debit-note/debit-note.routes'));
router.use('/bill-not-received', require('./bill-not-received/bill-not-received.routes'));

// Audit chain (off Lift)
router.use('/audit', require('./audit/audit.routes'));
router.use('/rectify', require('./rectify/rectify.routes'));
router.use('/reaudit', require('./reaudit/reaudit.routes'));
router.use('/tally-entry', require('./tally-entry/tally-entry.routes'));
router.use('/again-audit', require('./again-audit/again-audit.routes'));

// Payment
router.use('/payment', require('./payment/payment.routes'));
router.use('/payment-history', require('./payment-history/payment-history.routes'));

// Issue pipeline
router.use('/issue', require('./issue/issue.routes'));
router.use('/issue-approval', require('./issue-approval/issue-approval.routes'));

// Standalone
router.use('/inventory', require('./inventory/inventory.routes'));
router.use('/pc-report', require('./pc-report/pc-report.routes'));
router.use('/received', require('./received/received.routes'));

module.exports = router;
