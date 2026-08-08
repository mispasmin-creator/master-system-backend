const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { createIndent } = require('./indent.controller');

router.post('/', protect, createIndent);

module.exports = router;
