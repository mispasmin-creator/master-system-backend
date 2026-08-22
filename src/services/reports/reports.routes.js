const express = require('express');
const router = express.Router();
const { getDashboardSummary, getPendingWorkSummary } = require('./reports.controller');
const { protect } = require('../../middleware/auth');

router.get('/dashboard', protect, getDashboardSummary);
router.get('/pending', protect, getPendingWorkSummary);

module.exports = router;
