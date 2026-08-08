const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listFirms, createFirm } = require('./firms.controller');

router.get('/', listFirms);
router.post('/', protect, createFirm);

module.exports = router;
