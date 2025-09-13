const Redis = require('redis');
const NodeCache = require('node-cache');

class CachingService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = null;
    
    // Initialize Redis if URL is provided
    if (process.env.REDIS_URL) {
      this.setupRedis();
    } else {
      // Fallback to in-memory cache
      this.setupMemoryCache();
    }
  }

  // Setup Redis client
  async setupRedis() {
    try {
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        // Fallback to memory cache on Redis error
        if (!this.memoryCache) {
          this.setupMemoryCache();
        }
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Connected to Redis cache');
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.setupMemoryCache();
    }
  }

  // Setup in-memory cache as fallback
  setupMemoryCache() {
    this.memoryCache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false,
    });
    console.log('✅ Using in-memory cache');
  }

  // Get cached data
  async get(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else if (this.memoryCache) {
        return this.memoryCache.get(key) || null;
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached data
  async set(key, value, ttl = 600) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        return true;
      } else if (this.memoryCache) {
        this.memoryCache.set(key, value, ttl);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cached data
  async del(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.del(key);
        return true;
      } else if (this.memoryCache) {
        this.memoryCache.del(key);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        return true;
      } else if (this.memoryCache) {
        const keys = this.memoryCache.keys();
        const matchedKeys = keys.filter(key => key.includes(pattern.replace('*', '')));
        this.memoryCache.del(matchedKeys);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      return false;
    }
  }

  // Cache middleware for Express routes
  cacheMiddleware(ttl = 600, keyGenerator = null) {
    return async (req, res, next) => {
      try {
        // Generate cache key
        const cacheKey = keyGenerator 
          ? keyGenerator(req) 
          : `route_${req.method}_${req.originalUrl}_${JSON.stringify(req.query)}`;

        // Try to get cached response
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          console.log(`Cache hit for key: ${cacheKey}`);
          return res.json({
            ...cachedData,
            _cached: true,
            _cachedAt: new Date().toISOString(),
          });
        }

        // Store original res.json function
        const originalJson = res.json;

        // Override res.json to cache successful responses
        res.json = function(data) {
          if (res.statusCode === 200 && data.success !== false) {
            // Cache the response
            cachingService.set(cacheKey, data, ttl).catch(err => {
              console.error('Failed to cache response:', err);
            });
          }
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Cache trip search results
  async cacheTripsSearch(searchParams, trips, ttl = 300) {
    const key = `trips_search_${JSON.stringify(searchParams)}`;
    await this.set(key, trips, ttl);
  }

  async getCachedTripsSearch(searchParams) {
    const key = `trips_search_${JSON.stringify(searchParams)}`;
    return await this.get(key);
  }

  // Cache seat layout
  async cacheSeatLayout(tripId, seatLayout, ttl = 180) {
    const key = `seat_layout_${tripId}`;
    await this.set(key, seatLayout, ttl);
  }

  async getCachedSeatLayout(tripId) {
    const key = `seat_layout_${tripId}`;
    return await this.get(key);
  }

  // Cache user profile
  async cacheUserProfile(userId, profile, ttl = 1800) {
    const key = `user_profile_${userId}`;
    await this.set(key, profile, ttl);
  }

  async getCachedUserProfile(userId) {
    const key = `user_profile_${userId}`;
    return await this.get(key);
  }

  async invalidateUserProfile(userId) {
    const key = `user_profile_${userId}`;
    await this.del(key);
  }

  // Cache operator data
  async cacheOperatorData(operatorId, data, ttl = 3600) {
    const key = `operator_${operatorId}`;
    await this.set(key, data, ttl);
  }

  async getCachedOperatorData(operatorId) {
    const key = `operator_${operatorId}`;
    return await this.get(key);
  }

  async invalidateOperatorData(operatorId) {
    const key = `operator_${operatorId}`;
    await this.del(key);
  }

  // Cache cities list
  async cacheCities(cities, ttl = 86400) { // 24 hours
    const key = 'cities_list';
    await this.set(key, cities, ttl);
  }

  async getCachedCities() {
    const key = 'cities_list';
    return await this.get(key);
  }

  // Cache popular routes
  async cachePopularRoutes(routes, ttl = 3600) { // 1 hour
    const key = 'popular_routes';
    await this.set(key, routes, ttl);
  }

  async getCachedPopularRoutes() {
    const key = 'popular_routes';
    return await this.get(key);
  }

  // Cache dashboard data
  async cacheDashboardData(userId, role, data, ttl = 300) { // 5 minutes
    const key = `dashboard_${role}_${userId}`;
    await this.set(key, data, ttl);
  }

  async getCachedDashboardData(userId, role) {
    const key = `dashboard_${role}_${userId}`;
    return await this.get(key);
  }

  // Cache analytics data
  async cacheAnalyticsData(type, filters, data, ttl = 1800) { // 30 minutes
    const key = `analytics_${type}_${JSON.stringify(filters)}`;
    await this.set(key, data, ttl);
  }

  async getCachedAnalyticsData(type, filters) {
    const key = `analytics_${type}_${JSON.stringify(filters)}`;
    return await this.get(key);
  }

  // Cache bus location
  async cacheBusLocation(tripId, location, ttl = 30) { // 30 seconds
    const key = `bus_location_${tripId}`;
    await this.set(key, location, ttl);
  }

  async getCachedBusLocation(tripId) {
    const key = `bus_location_${tripId}`;
    return await this.get(key);
  }

  // Cache payment gateway tokens
  async cachePaymentToken(paymentId, token, ttl = 3600) {
    const key = `payment_token_${paymentId}`;
    await this.set(key, token, ttl);
  }

  async getCachedPaymentToken(paymentId) {
    const key = `payment_token_${paymentId}`;
    return await this.get(key);
  }

  async invalidatePaymentToken(paymentId) {
    const key = `payment_token_${paymentId}`;
    await this.del(key);
  }

  // Cache session data
  async cacheSession(sessionId, data, ttl = 86400) { // 24 hours
    const key = `session_${sessionId}`;
    await this.set(key, data, ttl);
  }

  async getCachedSession(sessionId) {
    const key = `session_${sessionId}`;
    return await this.get(key);
  }

  async invalidateSession(sessionId) {
    const key = `session_${sessionId}`;
    await this.del(key);
  }

  // Cache OTP
  async cacheOTP(phoneNumber, otp, ttl = 300) { // 5 minutes
    const key = `otp_${phoneNumber}`;
    await this.set(key, { otp, createdAt: Date.now() }, ttl);
  }

  async getCachedOTP(phoneNumber) {
    const key = `otp_${phoneNumber}`;
    return await this.get(key);
  }

  async invalidateOTP(phoneNumber) {
    const key = `otp_${phoneNumber}`;
    await this.del(key);
  }

  // Cache route calculations (distance, duration)
  async cacheRouteCalculation(origin, destination, calculation, ttl = 86400) {
    const key = `route_calc_${origin}_${destination}`;
    await this.set(key, calculation, ttl);
  }

  async getCachedRouteCalculation(origin, destination) {
    const key = `route_calc_${origin}_${destination}`;
    return await this.get(key);
  }

  // Batch operations
  async mget(keys) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        const values = await this.redisClient.mGet(keys);
        return values.map(value => value ? JSON.parse(value) : null);
      } else if (this.memoryCache) {
        return keys.map(key => this.memoryCache.get(key) || null);
      }
      return keys.map(() => null);
    } catch (error) {
      console.error('Batch get error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = 600) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        const multi = this.redisClient.multi();
        keyValuePairs.forEach(([key, value]) => {
          multi.setEx(key, ttl, JSON.stringify(value));
        });
        await multi.exec();
        return true;
      } else if (this.memoryCache) {
        keyValuePairs.forEach(([key, value]) => {
          this.memoryCache.set(key, value, ttl);
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Batch set error:', error);
      return false;
    }
  }

  // Cache statistics
  async getCacheStats() {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        const info = await this.redisClient.info('memory');
        return {
          type: 'redis',
          memory: info,
        };
      } else if (this.memoryCache) {
        return {
          type: 'memory',
          keys: this.memoryCache.keys().length,
          stats: this.memoryCache.getStats(),
        };
      }
      return { type: 'none' };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { type: 'error', error: error.message };
    }
  }

  // Invalidate related caches when data changes
  async invalidateRelatedCaches(entity, entityId) {
    const patterns = {
      booking: [`booking_${entityId}`, `user_bookings_*`, `trip_bookings_*`],
      trip: [`trip_${entityId}`, `trips_search_*`, `seat_layout_${entityId}`],
      user: [`user_profile_${entityId}`, `user_bookings_${entityId}`],
      operator: [`operator_${entityId}`, `operator_*`],
      route: [`route_${entityId}`, `trips_search_*`, `popular_routes`],
    };

    const keysToInvalidate = patterns[entity] || [];
    
    for (const pattern of keysToInvalidate) {
      if (pattern.includes('*')) {
        await this.clearPattern(pattern);
      } else {
        await this.del(pattern);
      }
    }
  }

  // Cleanup expired keys (for memory cache)
  flushExpired() {
    if (this.memoryCache) {
      this.memoryCache.flushAll();
    }
  }

  // Close connections
  async close() {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.quit();
      }
      if (this.memoryCache) {
        this.memoryCache.close();
      }
    } catch (error) {
      console.error('Error closing cache connections:', error);
    }
  }
}

// Create singleton instance
const cachingService = new CachingService();

module.exports = cachingService;