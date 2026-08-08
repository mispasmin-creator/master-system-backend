const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submitStage } = require('./accountsAudit.controller');

router.get('/data', listData);
router.post('/:stage/submit/:mismatchId', protect, submitStage);

module.exports = router;
