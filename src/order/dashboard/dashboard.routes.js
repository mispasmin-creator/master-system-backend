const express = require('express');
const router = express.Router();
const { getDashboard, getProcessDashboard } = require('./dashboard.controller');

router.get('/', getDashboard);
router.get('/process', getProcessDashboard);

module.exports = router;
