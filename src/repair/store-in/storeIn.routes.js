const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceStoreIn } = require('./storeIn.controller');

router.post('/store-in', advanceStoreIn);

module.exports = router;
