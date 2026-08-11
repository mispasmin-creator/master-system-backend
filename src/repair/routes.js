const express = require('express');
const router = express.Router();

const indentRoutes = require('./indent/indent.routes');
const sentToVendorRoutes = require('./sent-to-vendor/sentToVendor.routes');
const checkMachineRoutes = require('./check-machine/checkMachine.routes');
const storeInRoutes = require('./store-in/storeIn.routes');
const makePaymentRoutes = require('./make-payment/makePayment.routes');
const advancePaymentRoutes = require('./advance/advancePayment.routes');
const accountsRoutes = require('./accounts/accounts.routes');
const masterRoutes = require('./master/master.routes');
const settingsRoutes = require('./settings/settings.routes');

// Indent & task listing endpoints
router.use('/tasks', indentRoutes);

// Stage advancement endpoints on /tasks/:id/*
router.use('/tasks/:id', sentToVendorRoutes);
router.use('/tasks/:id', checkMachineRoutes);
router.use('/tasks/:id', storeInRoutes);
router.use('/tasks/:id', makePaymentRoutes);

// Advance Payments endpoint
router.use('/advance-payments', advancePaymentRoutes);

// Accounts stage view endpoint
router.use('/accounts', accountsRoutes);

// Master dropdowns endpoint
router.use('/master', masterRoutes);

// User settings endpoint
router.use('/settings', settingsRoutes);

module.exports = router;
