const express = require('express');
const router = express.Router();

router.use('/raw-material', require('./raw-material/rawMaterial.routes'));
router.use('/finished-goods', require('./finished-goods/finishedGoods.routes'));
router.use('/trading-material', require('./trading-material/tradingMaterial.routes'));
router.use('/stock-adjustment', require('./stock-adjustment/stockAdjustment.routes'));
router.use('/history', require('./history/history.routes'));
router.use('/settings', require('./master/master.routes'));
router.use('/master', require('./master/master.routes'));

// Overview / status route
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: { message: 'Inventory Module API is active.' },
  });
});

module.exports = router;
