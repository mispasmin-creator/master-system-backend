const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, submit, cancelOrder } = require('./dispatchPlanning.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/submit', protect, submit);
router.post('/cancel', protect, cancelOrder);

module.exports = router;
