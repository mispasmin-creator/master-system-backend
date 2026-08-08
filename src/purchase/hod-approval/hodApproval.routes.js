const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, upsertApproval, revert } = require('./hodApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:indentId/revert', protect, revert);
router.post('/:indentId', protect, upsertApproval);

module.exports = router;
