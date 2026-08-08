const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, toggle } = require('./poEntry.controller');

router.get('/data', listData);
router.post('/toggle', protect, toggle);

module.exports = router;
