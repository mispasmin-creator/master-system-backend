const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listData, submitBilty, updateBilty, revertBilty } = require('./bilty.controller');

router.get('/data', listData);
router.post('/submit', protect, submitBilty);
router.post('/update/:biltyId', protect, requireSuperAdmin, updateBilty);
router.post('/revert', protect, requireSuperAdmin, revertBilty);

module.exports = router;
