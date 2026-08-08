const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getPending, getHistory, getRmSummary, createLog } = require('./production-tracking.controller');

router.route('/pending')
  .get(protect, getPending);

router.route('/history')
  .get(protect, getHistory);

router.route('/rm-summary')
  .get(protect, getRmSummary);

router.route('/log')
  .post(protect, createLog);

module.exports = router;
