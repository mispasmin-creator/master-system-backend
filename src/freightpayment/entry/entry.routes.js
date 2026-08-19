const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, create, getDispatchInfo } = require('./entry.controller');

router.route('/')
  .get(getAll)
  .post(protect, create);

router.get('/dispatch-lookup/:liftId', protect, getDispatchInfo);

router.route('/:id')
  .get(protect, getOne);

module.exports = router;
