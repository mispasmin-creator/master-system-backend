const express = require('express');
const router = express.Router();
const controller = require('./approval.controller');
const { protect } = require('../../middleware/auth');

router.post('/:id/approve', protect, controller.handleApproval);

module.exports = router;
