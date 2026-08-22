const express = require('express');
const router = express.Router();
const { getUtilities, createUtility, updateUtility, approveUtility, payUtility } = require('./utility.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getUtilities);
router.post('/', protect, createUtility);
router.put('/:id', protect, updateUtility);
router.post('/:id/approve', protect, approveUtility);
router.post('/:id/pay', protect, payUtility);

module.exports = router;
