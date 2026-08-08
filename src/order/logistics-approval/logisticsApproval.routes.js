const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, getSplitsForGroup, approve, reject } = require('./logisticsApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.get('/splits', getSplitsForGroup);
router.post('/approve', protect, approve);
router.post('/reject', protect, reject);

module.exports = router;
