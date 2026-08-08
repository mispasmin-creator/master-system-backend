const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, listReport, submit } = require('./invoice.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.get('/report', listReport);
router.post('/submit', protect, submit);

module.exports = router;
