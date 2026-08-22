const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listPending, listHistory, approve, reject, revert } = require('./managementApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:indentId/approve', protect, approve);
router.post('/:indentId/reject', protect, reject);
router.post('/:indentId/revert', protect, requireSuperAdmin, revert);

module.exports = router;
