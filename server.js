const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const userRoutes = require('./src/routes/userRoutes');

// Load environment variables (with support for ${VAR} references within .env)
dotenvExpand.expand(dotenv.config());

// Initialize express app
const app = express();
console.log('App reloaded with productionOrder support:', Date.now());

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

// System Modules
app.use('/api/purchase', require('./src/purchase/routes'));
app.use('/api/order',    require('./src/order/routes'));
app.use('/api/production', require('./src/production/routes'));
app.use('/api/store',      require('./src/store/routes'));
app.use('/api/rmsales',   require('./src/rmsales/routes'));
app.use('/api/rm-sales',  require('./src/rmsales/routes'));
app.use('/api/checklist', require('./src/checklist/routes'));
app.use('/api/checklist-master', require('./src/checklist/checklist-master/checklist-master.routes'));
app.use('/api/freightpayment', require('./src/freightpayment/routes'));
app.use('/api/freight-payment', require('./src/freightpayment/routes'));
app.use('/api/inventory', require('./src/inventory/routes'));
app.use('/api/payment',   require('./src/payment/routes')); // Make Payment subsystem
app.use('/api/services',  require('./src/services/routes'));
app.use('/api/repair',    require('./src/repair/routes'));
app.use('/api/upload',   require('./src/routes/uploadRoutes'));

// Serve uploads folder statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic health check route (Merge System API - Issue Data & Inventory Synced)
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Merge System API. API is running smoothly.' });
});

// Error handling middleware
app.use(errorHandler);

// Port configuration
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);

  // Initialize Inventory Daily Stock Snapshot Cron (Runs at 00:00 IST / 18:30 UTC daily)
  try {
    const cron = require('node-cron');
    const { captureSnapshot } = require('./src/inventory/shared/dailySnapshot.service');
    // Cron schedule '0 0 * * *' in Asia/Kolkata timezone
    cron.schedule(
      '0 0 * * *',
      async () => {
        try {
          await captureSnapshot();
        } catch (cronErr) {
          console.error('Scheduled daily stock snapshot failed:', cronErr.message);
        }
      },
      { timezone: 'Asia/Kolkata' }
    );
    console.log('Daily inventory stock snapshot cron initialized (Scheduled for 00:00 IST).');
  } catch (err) {
    console.error('Failed to initialize daily snapshot cron:', err.message);
  }
});
