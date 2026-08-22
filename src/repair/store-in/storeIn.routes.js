const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceStoreIn } = require('./storeIn.controller');
const { protect } = require('../../middleware/auth');

router.post('/store-in', protect, advanceStoreIn);

module.exports = router;
