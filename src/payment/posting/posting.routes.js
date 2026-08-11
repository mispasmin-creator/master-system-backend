const express = require('express');
const router = express.Router();
const controller = require('./posting.controller');

router.post('/:id/post', controller.handlePosting);

module.exports = router;
