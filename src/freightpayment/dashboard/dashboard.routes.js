const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getSummary } = require('./dashboard.controller');

router.get('/summary', protect, getSummary);

module.exports = router;
