const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listPending, listHistory, upsertApproval, revert } = require('./hodApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:indentId/revert', protect, requireSuperAdmin, revert);
router.post('/:indentId', protect, upsertApproval);

module.exports = router;
