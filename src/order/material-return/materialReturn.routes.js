const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { lookupInvoice, createReturn, listAll } = require('./materialReturn.controller');

router.get('/lookup', lookupInvoice);
router.get('/', listAll);
router.post('/', protect, createReturn);

module.exports = router;
