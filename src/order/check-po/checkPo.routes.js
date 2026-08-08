const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, upsertCheckPo, revert } = require('./checkPo.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:receiptId', protect, upsertCheckPo);
router.post('/:receiptId/revert', protect, revert);

module.exports = router;
