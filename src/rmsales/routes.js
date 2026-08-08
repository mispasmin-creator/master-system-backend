const express = require('express');
const router = express.Router();

router.use('/party',     require('./party/party.routes'));
router.use('/product',   require('./product/product.routes'));
router.use('/inventory', require('./inventory/inventory.routes'));
router.use('/order',     require('./order/order.routes'));
router.use('/logistics', require('./logistics/logistics.routes'));
router.use('/invoice',   require('./invoice/invoice.routes'));
router.use('/dashboard', require('./dashboard/dashboard.routes'));

router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'RM Sales System overview' } });
});

module.exports = router;
