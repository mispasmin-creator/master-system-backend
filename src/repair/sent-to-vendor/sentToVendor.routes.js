const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceSentToVendor } = require('./sentToVendor.controller');
const { protect } = require('../../middleware/auth');

router.post('/sent-to-vendor', protect, advanceSentToVendor);

module.exports = router;
