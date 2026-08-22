const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listPending, listHistory, submit, reject, updateRate, revert } = require('./threeParty.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:indentId/reject', protect, reject);
router.post('/:indentId/update-rate', protect, requireSuperAdmin, updateRate);
router.post('/:indentId/revert', protect, requireSuperAdmin, revert);
router.post('/:indentId', protect, submit);

module.exports = router;
