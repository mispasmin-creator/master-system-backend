const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, approve, reject } = require('./managementApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:id/approve', protect, approve);
router.post('/:id/reject', protect, reject);

module.exports = router;
