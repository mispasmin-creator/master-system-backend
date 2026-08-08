const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, upsertCheckDelivery } = require('./checkDelivery.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:receiptId', protect, upsertCheckDelivery);

module.exports = router;
