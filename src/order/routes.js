const express = require('express');
const router = express.Router();

router.use('/receipt',            require('./receipt/receipt.routes'));
router.use('/check-po',           require('./check-po/checkPo.routes'));
router.use('/received-accounts',  require('./received-accounts/receivedAccounts.routes'));
router.use('/check-delivery',     require('./check-delivery/checkDelivery.routes'));
router.use('/arrange-logistics',  require('./arrange-logistics/arrangeLogistics.routes'));
router.use('/logistics-approval', require('./logistics-approval/logisticsApproval.routes'));
router.use('/dispatch-planning',  require('./dispatch-planning/dispatchPlanning.routes'));
router.use('/accounts-approval',  require('./accounts-approval/accountsApproval.routes'));
router.use('/logistic',           require('./logistic/logistic.routes'));
router.use('/load-material',      require('./load-material/loadMaterial.routes'));
router.use('/wetman-entry',       require('./wetman-entry/wetmanEntry.routes'));
router.use('/invoice',            require('./invoice/invoice.routes'));
router.use('/fullkitting',        require('./fullkitting/fullkitting.routes'));
router.use('/tc',                 require('./tc/tc.routes'));
router.use('/delivery',           require('./delivery/delivery.routes'));
router.use('/crm',                require('./crm/crm.routes'));
router.use('/pi',                 require('./pi/pi.routes'));
router.use('/retention',          require('./retention/retention.routes'));
router.use('/material-return',    require('./material-return/materialReturn.routes'));
router.use('/material-return/management-approval', require('./material-return/managementApproval.routes'));
router.use('/material-return/debit-note',          require('./material-return/debitNote.routes'));
router.use('/material-return/return-dispatch',     require('./material-return/returnDispatch.routes'));
router.use('/master',             require('./master/master.routes'));
router.use('/dashboard',          require('./dashboard/dashboard.routes'));

router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'Order System overview' } });
});

module.exports = router;
