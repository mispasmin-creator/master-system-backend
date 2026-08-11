const express = require('express');
const router = express.Router();
const { getBills } = require('./bill.controller');

router.get('/', getBills);

module.exports = router;
