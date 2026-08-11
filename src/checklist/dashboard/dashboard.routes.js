const express = require('express');
const router = express.Router();
const { getDashboardStats, getDashboardSummary } = require('./dashboard.controller');
const { protect } = require('../../middleware/auth');

router.get('/summary', protect, getDashboardSummary);
router.get('/', protect, getDashboardStats);

module.exports = router;
