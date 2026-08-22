const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listPending, listHistory, submit, revert } = require('./factoryApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:indentId/revert', protect, requireSuperAdmin, revert);
router.post('/:indentId', protect, submit);

module.exports = router;
