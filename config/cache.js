const redis = require('../config/redis');

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}:${req.userId || 'guest'}`;

    try {
      // Check cache
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        console.log('✅ Cache HIT:', key);
        return res.json(JSON.parse(cachedData));
      }

      console.log('❌ Cache MISS:', key);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = (data) => {
        redis.setex(key, duration, JSON.stringify(data))
          .catch(err => console.error('Cache set error:', err));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Clear cache helper
const clearCache = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    console.error('Clear cache error:', error);
  }
};

// Clear user-specific cache
const clearUserCache = (userId) => {
  return clearCache(`cache:*:${userId}`);
};

module.exports = { cacheMiddleware, clearCache, clearUserCache };