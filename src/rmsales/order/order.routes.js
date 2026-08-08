const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, create, approve, reject } = require('./order.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.route('/:id')
  .get(protect, getOne);

router.patch('/:id/approve', protect, approve);
router.patch('/:id/reject', protect, reject);

module.exports = router;
