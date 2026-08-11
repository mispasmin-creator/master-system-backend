const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceSentToVendor } = require('./sentToVendor.controller');

router.post('/sent-to-vendor', advanceSentToVendor);

module.exports = router;
