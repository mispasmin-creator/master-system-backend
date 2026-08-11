const express = require('express');
const router = express.Router();
const { getAccountsData, updateAccountsAudit } = require('./accounts.controller');

router.get('/', getAccountsData);
router.post('/:id', updateAccountsAudit);
router.put('/:id', updateAccountsAudit);

module.exports = router;
