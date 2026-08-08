const express = require('express');
const router = express.Router();

router.use('/firms', require('./firms/firms.routes'));
router.use('/master', require('./master/master.routes'));
router.use('/indent', require('./indent/indent.routes'));
router.use('/hod-approval', require('./hod-approval/hodApproval.routes'));
router.use('/three-party', require('./three-party/threeParty.routes'));
router.use('/factory-approval', require('./factory-approval/factoryApproval.routes'));
router.use('/management-approval', require('./management-approval/managementApproval.routes'));
router.use('/generate-po', require('./generate-po/generatePo.routes'));
router.use('/arrange-logistics', require('./arrange-logistics/arrangeLogistics.routes'));
router.use('/logistics-approval', require('./logistics-approval/logisticsApproval.routes'));
router.use('/po-entry', require('./po-entry/poEntry.routes'));
router.use('/advance-payment', require('./advance-payment/advancePayment.routes'));
router.use('/lift', require('./lift/lift.routes'));

// Post-lift stages (lift ke baad ke steps)
router.use('/receipt', require('./receipt/receipt.routes'));
router.use('/unload-approval', require('./unload-approval/unloadApproval.routes'));
router.use('/lab', require('./lab/lab.routes'));
router.use('/bilty', require('./bilty/bilty.routes'));
router.use('/mismatch', require('./mismatch/mismatch.routes'));

// Post-mismatch triage stages (mismatch ke baad ke steps)
router.use('/purchaser-coordinate', require('./purchaser-coordinate/purchaserCoordinate.routes'));
router.use('/purchase-return', require('./purchase-return/purchaseReturn.routes'));
router.use('/fullkitting', require('./fullkitting/fullkitting.routes'));
router.use('/accounts-audit', require('./accounts-audit/accountsAudit.routes'));
router.use('/debit-note', require('./debit-note/debitNote.routes'));

// @desc    Purchase system overview placeholder (kept from the original module)
// @route   GET /api/purchase
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: { message: 'Purchase System overview data' },
  });
});

module.exports = router;
