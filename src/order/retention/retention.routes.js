const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listGroups, upsertRetention } = require('./retention.controller');

router.get('/', listGroups);
router.post('/', protect, upsertRetention);

module.exports = router;
