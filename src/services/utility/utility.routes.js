const express = require('express');
const router = express.Router();
const { getUtilities, createUtility, updateUtility, approveUtility, payUtility } = require('./utility.controller');

router.get('/', getUtilities);
router.post('/', createUtility);
router.put('/:id', updateUtility);
router.post('/:id/approve', approveUtility);
router.post('/:id/pay', payUtility);

module.exports = router;
