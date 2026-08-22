const express = require('express');
const router = express.Router();
const { getBills } = require('./bill.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getBills);

module.exports = router;
