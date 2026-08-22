const express = require('express');
const router = express.Router();
const controller = require('./posting.controller');
const { protect } = require('../../middleware/auth');

router.post('/:id/post', protect, controller.handlePosting);

module.exports = router;
