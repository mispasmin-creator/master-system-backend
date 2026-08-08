const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submitBilty, updateBilty, revertBilty } = require('./bilty.controller');

router.get('/data', listData);
router.post('/submit', protect, submitBilty);
router.post('/update/:biltyId', protect, updateBilty);
router.post('/revert', protect, revertBilty);

module.exports = router;
