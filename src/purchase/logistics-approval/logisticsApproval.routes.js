const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submit } = require('./logisticsApproval.controller');

router.get('/data', listData);
router.post('/submit', protect, submit);

module.exports = router;
