const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceCheckMachine } = require('./checkMachine.controller');
const { protect } = require('../../middleware/auth');

router.post('/check-machine', protect, advanceCheckMachine);

module.exports = router;
