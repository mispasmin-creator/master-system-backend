const express = require('express');
const router = express.Router();
const { getMasterData } = require('./master.controller');

router.get('/', getMasterData);

module.exports = router;
