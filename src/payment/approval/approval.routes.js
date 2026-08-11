const express = require('express');
const router = express.Router();
const controller = require('./approval.controller');

router.post('/:id/approve', controller.handleApproval);

module.exports = router;
