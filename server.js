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
app.use('/api/refrasynth', require('./src/refrasynth/routes'));
app.use('/api/rmsales',   require('./src/rmsales/routes'));
app.use('/api/upload',   require('./src/routes/uploadRoutes'));

// Serve uploads folder statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic health check route
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
});
