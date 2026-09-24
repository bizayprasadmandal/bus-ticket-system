const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('redis');

class RateLimitingService {
  constructor() {
    this.redisClient = null;
    this.rateLimiterRedis = null;
    
    if (process.env.REDIS_URL) {
      this.setupRedisRateLimiter();
    }
  }

  // Setup Redis-based rate limiter
  setupRedisRateLimiter() {
    try {
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL,
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.rateLimiterRedis = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: 'rl_gadi',
        points: 100, // Number of requests
        duration: 900, // Per 15 minutes (900 seconds)
      });
    } catch (error) {
      console.error('Failed to setup Redis rate limiter:', error);
    }
  }

  // General API rate limiting
  getGeneralRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Use Redis store if available
      store: this.redisClient ? undefined : 'memory',
    });
  }

  // Authentication rate limiting (stricter for login attempts)
  getAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful requests
    });
  }

  // Booking rate limiting (prevent spam bookings)
  getBookingRateLimit() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 3, // limit each IP to 3 booking attempts per 5 minutes
      message: {
        success: false,
        message: 'Too many booking attempts, please try again later.',
        retryAfter: '5 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Payment rate limiting (strict for payment endpoints)
  getPaymentRateLimit() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 5, // limit each IP to 5 payment attempts per 10 minutes
      message: {
        success: false,
        message: 'Too many payment attempts, please try again later.',
        retryAfter: '10 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Search rate limiting (prevent search abuse)
  getSearchRateLimit() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: {
        success: false,
        message: 'Too many search requests, please slow down.',
        retryAfter: '1 minute',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // OTP rate limiting (prevent OTP spam)
  getOTPRateLimit() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 3, // 3 OTP requests per 5 minutes per IP
      message: {
        success: false,
        message: 'Too many OTP requests, please wait before requesting again.',
        retryAfter: '5 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Progressive slowdown middleware
  getSlowDownMiddleware() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes at full speed
      delayMs: 500, // add 500ms delay after delayAfter is reached
      maxDelayMs: 5000, // max delay of 5 seconds
    });
  }

  // Advanced Redis-based rate limiting with user-specific limits
  getUserSpecificRateLimit(pointsPerUser = 200, durationSeconds = 900) {
    return async (req, res, next) => {
      if (!this.rateLimiterRedis) {
        return next(); // Skip if Redis is not available
      }

      try {
        const userId = req.user?.id || req.ip;
        const key = `user_${userId}`;

        await this.rateLimiterRedis.consume(key);
        next();
      } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        res.status(429).json({
          success: false,
          message: 'Rate limit exceeded for user',
          retryAfter: `${secs} seconds`,
        });
      }
    };
  }

  // Operator-specific rate limiting (higher limits for operators)
  getOperatorRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // Higher limit for operators
      message: {
        success: false,
        message: 'Operator rate limit exceeded, please try again later.',
        retryAfter: '15 minutes',
      },
      skip: (req) => {
        // Skip rate limiting for super admins
        const userRoles = req.user?.roles || [];
        return userRoles.some(role => role.role === 'SUPER_ADMIN' && role.is_active);
      },
    });
  }

  // File upload rate limiting
  getFileUploadRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 file uploads per hour
      message: {
        success: false,
        message: 'Too many file uploads, please try again later.',
        retryAfter: '1 hour',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Report generation rate limiting
  getReportRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 report generations per hour
      message: {
        success: false,
        message: 'Too many report generation requests, please try again later.',
        retryAfter: '1 hour',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Dynamic rate limiting based on endpoint sensitivity
  getDynamicRateLimit(endpoint) {
    const limits = {
      '/api/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
      '/api/auth/register': { windowMs: 15 * 60 * 1000, max: 3 },
      '/api/bookings': { windowMs: 5 * 60 * 1000, max: 3 },
      '/api/payments': { windowMs: 10 * 60 * 1000, max: 5 },
      '/api/trips/search': { windowMs: 1 * 60 * 1000, max: 30 },
      '/api/seat-locks': { windowMs: 1 * 60 * 1000, max: 10 },
    };

    const config = limits[endpoint] || { windowMs: 15 * 60 * 1000, max: 100 };

    return rateLimit({
      ...config,
      message: {
        success: false,
        message: `Rate limit exceeded for ${endpoint}`,
        retryAfter: `${config.windowMs / 1000 / 60} minutes`,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Middleware to apply different rate limits based on user role
  getRoleBasedRateLimit() {
    return (req, res, next) => {
      const userRoles = req.user?.roles || [];
      const isSuperAdmin = userRoles.some(role => role.role === 'SUPER_ADMIN' && role.is_active);
      const isOperator = userRoles.some(role => role.role === 'OPERATOR' && role.is_active);

      if (isSuperAdmin) {
        // No rate limiting for super admins
        return next();
      }

      if (isOperator) {
        // Higher limits for operators
        return this.getOperatorRateLimit()(req, res, next);
      }

      // Standard rate limiting for customers
      return this.getGeneralRateLimit()(req, res, next);
    };
  }

  // Burst rate limiting for high-frequency endpoints
  getBurstRateLimit() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute (1 per second)
      message: {
        success: false,
        message: 'Request rate too high, please slow down.',
        retryAfter: '1 minute',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // IP whitelist for trusted sources
  getWhitelistedRateLimit(whitelist = []) {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000, // Higher limit
      skip: (req) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        return whitelist.includes(clientIP);
      },
      message: {
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: '15 minutes',
      },
    });
  }

  // Custom rate limiter for specific business logic
  createCustomRateLimit(options) {
    const {
      windowMs = 15 * 60 * 1000,
      max = 100,
      keyGenerator = (req) => req.ip,
      skipFunction = () => false,
      message = 'Rate limit exceeded',
    } = options;

    return rateLimit({
      windowMs,
      max,
      keyGenerator,
      skip: skipFunction,
      message: {
        success: false,
        message,
        retryAfter: `${windowMs / 1000 / 60} minutes`,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
}

module.exports = RateLimitingService;