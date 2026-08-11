const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceCheckMachine } = require('./checkMachine.controller');

router.post('/check-machine', advanceCheckMachine);

module.exports = router;
