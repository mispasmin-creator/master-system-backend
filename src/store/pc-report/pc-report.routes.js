const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getPcReport } = require('./pc-report.controller');

router.route('/')
  .get(protect, getPcReport);

module.exports = router;
