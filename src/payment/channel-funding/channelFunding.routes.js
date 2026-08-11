const express = require('express');
const router = express.Router();
const controller = require('./channelFunding.controller');

router.post('/:id/channel-funding', controller.handleChannelFunding);

module.exports = router;
