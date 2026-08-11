const express = require('express');
const router = express.Router();
const { createIndent, getTasks, getTaskById } = require('./indent.controller');

router.post('/', createIndent);
router.get('/', getTasks);
router.get('/:id', getTaskById);

module.exports = router;
