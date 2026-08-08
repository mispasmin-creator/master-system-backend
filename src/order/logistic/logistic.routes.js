const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, submit } = require('./logistic.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/submit', protect, submit);

module.exports = router;
