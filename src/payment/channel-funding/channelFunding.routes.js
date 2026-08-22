const express = require('express');
const router = express.Router();
const controller = require('./channelFunding.controller');
const { protect } = require('../../middleware/auth');

router.post('/:id/channel-funding', protect, controller.handleChannelFunding);

module.exports = router;
