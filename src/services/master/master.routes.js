const express = require('express');
const router = express.Router();
const { getMasterDropdowns } = require('./master.controller');

router.get('/', getMasterDropdowns);

module.exports = router;
