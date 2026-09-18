const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { CronJob } = require('cron');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');
const { setupSwagger } = require('./config/swagger');

// Import services
const WebSocketService = require('./services/websocket');
const cachingService = require('./services/caching');
const RateLimitingService = require('./services/rate-limiting');
const { NotificationService } = require('./services/notifications');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const operatorRoutes = require('./routes/operators');
const cityRoutes = require('./routes/cities');
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const tripRoutes = require('./routes/trips');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const seatLockRoutes = require('./routes/seat-locks');
const walletRoutes = require('./routes/wallets');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression and logging
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Samaya Deluxe API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/seat-locks', seatLockRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 3000;

// Swagger API docs
if (process.env.ENABLE_API_DOCS === 'true') {
  setupSwagger(app);
  console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models
    const { sequelize } = require('./models');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synced.');

    // Setup automated seat lock cleanup cron (every 2 minutes)
    const seatLockCleanup = new CronJob('*/2 * * * *', async () => {
      try {
        const { SeatLock } = require('./models');
        const { Op } = require('sequelize');
        const result = await SeatLock.update(
          { status: 'RELEASED' },
          {
            where: {
              status: 'LOCKED',
              expires_at: { [Op.lt]: new Date() },
            },
          }
        );
        if (result[0] > 0) {
          console.log(`🧹 Cleaned up ${result[0]} expired seat locks`);
        }
      } catch (error) {
        console.error('Seat lock cleanup error:', error.message);
      }
    });
    seatLockCleanup.start();
    console.log('✅ Seat lock cleanup cron started (every 2 minutes)');

    app.listen(PORT, () => {
      console.log(`🚀 Samaya Deluxe API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;