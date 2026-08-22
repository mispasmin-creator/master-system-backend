const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listData, createLift, cancelPo, editPo, editLift } = require('./lift.controller');

router.get('/data', listData);
router.post('/create', protect, createLift);
router.post('/cancel', protect, cancelPo);
router.post('/po/:indentId', protect, requireSuperAdmin, editPo);
router.post('/entry/:liftId', protect, requireSuperAdmin, editLift);

module.exports = router;
