const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');

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
const reportRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/uploads');

const app = express();
const server = http.createServer(app);

// Initialize services
const rateLimitingService = new RateLimitingService();
const notificationService = new NotificationService();
let webSocketService;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Rate limiting
app.use('/api/', rateLimitingService.getGeneralRateLimit());
app.use('/api/auth', rateLimitingService.getAuthRateLimit());
app.use('/api/bookings', rateLimitingService.getBookingRateLimit());
app.use('/api/payments', rateLimitingService.getPaymentRateLimit());
app.use('/api/trips/search', rateLimitingService.getSearchRateLimit());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression and logging
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await testConnection();
    
    // Get cache status
    const cacheStats = await cachingService.getCacheStats();
    
    res.json({
      success: true,
      message: 'Samaya Deluxe API is running',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      services: {
        database: 'connected',
        cache: cacheStats.type,
        websocket: webSocketService ? 'active' : 'inactive',
        notifications: 'active',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      error: error.message,
    });
  }
});

// Cache middleware for frequently accessed endpoints
app.use('/api/cities', cachingService.cacheMiddleware(86400)); // 24 hours
app.use('/api/operators', cachingService.cacheMiddleware(3600)); // 1 hour
app.use('/api/routes/popular', cachingService.cacheMiddleware(3600)); // 1 hour

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
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  if (webSocketService) {
    res.json({
      success: true,
      connected_users: webSocketService.getConnectedUsersCount(),
      active_rooms: Array.from(webSocketService.roomSubscriptions.keys()).length,
    });
  } else {
    res.json({
      success: false,
      message: 'WebSocket service not initialized',
    });
  }
});

// Cache management endpoints (admin only)
app.post('/api/admin/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      await cachingService.clearPattern(pattern);
      res.json({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`,
      });
    } else {
      await cachingService.flushExpired();
      res.json({
        success: true,
        message: 'Expired cache entries cleared',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message,
    });
  }
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Initialize WebSocket service
    webSocketService = new WebSocketService(server);
    console.log('✅ WebSocket service initialized');
    
    // Make services globally available
    app.locals.webSocketService = webSocketService;
    app.locals.notificationService = notificationService;
    app.locals.cachingService = cachingService;
    
    server.listen(PORT, () => {
      console.log(`🚀 Samaya Deluxe API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`💾 Cache: ${cachingService.redisClient ? 'Redis' : 'Memory'}`);
      console.log(`🔒 Security: Rate limiting enabled`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      
      server.close(() => {
        console.log('HTTP server closed');
      });
      
      // Close cache connections
      await cachingService.close();
      
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      
      server.close(() => {
        console.log('HTTP server closed');
      });
      
      await cachingService.close();
      
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

module.exports = { app, server };