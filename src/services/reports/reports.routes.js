const express = require('express');
const router = express.Router();
const { getDashboardSummary, getPendingWorkSummary } = require('./reports.controller');

router.get('/dashboard', getDashboardSummary);
router.get('/pending', getPendingWorkSummary);

module.exports = router;
