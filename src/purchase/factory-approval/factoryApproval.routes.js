const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, submit, revert } = require('./factoryApproval.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:indentId/revert', protect, revert);
router.post('/:indentId', protect, submit);

module.exports = router;
