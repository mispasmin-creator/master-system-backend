const express = require('express');
const router = express.Router();
const { createIndent, getTasks, getTaskById } = require('./indent.controller');
const { protect } = require('../../middleware/auth');

router.post('/', protect, createIndent);
router.get('/', protect, getTasks);
router.get('/:id', protect, getTaskById);

module.exports = router;
