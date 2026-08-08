const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submitKitting, bulkUpdate } = require('./fullkitting.controller');

router.get('/data', listData);
router.post('/submit', protect, submitKitting);
router.post('/bulk-update', protect, bulkUpdate);

module.exports = router;
