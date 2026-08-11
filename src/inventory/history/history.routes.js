const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getHistory, triggerSnapshot } = require('./history.controller');

router.get('/', protect, getHistory);
router.post('/snapshot', protect, triggerSnapshot);

module.exports = router;
