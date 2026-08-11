const express = require('express');
const router = express.Router();
const { listPendingVerification, verifyTask } = require('./verification.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, listPendingVerification);
router.patch('/:id/verify', protect, verifyTask);

module.exports = router;
