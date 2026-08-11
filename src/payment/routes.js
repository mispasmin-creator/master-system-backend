const express = require('express');
const router = express.Router();

router.use('/requests', require('./requests/paymentRequest.routes'));
router.use('/requests', require('./channel-funding/channelFunding.routes'));
router.use('/requests', require('./approval/approval.routes'));
router.use('/requests', require('./posting/posting.routes'));
router.use('/requests', require('./make-payment/makePayment.routes'));
router.use('/vendors',  require('./vendors/vendor.routes'));
router.use('/master',   require('./master/master.routes'));
router.use('/settings', require('./master/settings.routes'));

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Make Payment System API is active.' });
});

module.exports = router;
