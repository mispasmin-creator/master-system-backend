const express = require('express');
const router = express.Router();
const { getAccountsData, updateAccountsAudit } = require('./accounts.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getAccountsData);
router.post('/:id', protect, updateAccountsAudit);
router.put('/:id', protect, updateAccountsAudit);

module.exports = router;
