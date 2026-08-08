const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, lookupLift, lookupPo, listLifts, nextNumber, saveReturn } = require('./purchaseReturn.controller');

router.get('/data', listData);
router.get('/lifts', listLifts);
router.get('/lift/:liftNo', lookupLift);
router.get('/po/:poNo', lookupPo);
router.get('/next-number', nextNumber);
router.post('/submit', protect, saveReturn);
router.post('/update/:returnId', protect, saveReturn);

module.exports = router;
