const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, approve } = require('./accountsApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/approve', protect, approve);

module.exports = router;
