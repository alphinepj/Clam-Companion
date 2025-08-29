const NodeCache = require('node-cache');
const { logger } = require('../config/db');

// Create cache instance with default TTL of 5 minutes
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Better performance
});

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const key = `__express__${req.originalUrl || req.url}`;
    
    // Check if response is cached
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      logger.info('Cache hit', { key, path: req.path });
      return res.json(cachedResponse);
    }

    // Store original send function
    const originalSend = res.json;

    // Override send function to cache response
    res.json = function(body) {
      // Cache the response
      cache.set(key, body, duration);
      logger.info('Cache miss - storing response', { key, path: req.path, ttl: duration });
      
      // Call original send function
      return originalSend.call(this, body);
    };

    next();
  };
};

// Cache invalidation middleware
const invalidateCache = (pattern) => {
  return (req, res, next) => {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    if (matchingKeys.length > 0) {
      cache.del(matchingKeys);
      logger.info('Cache invalidated', { pattern, keys: matchingKeys });
    }
    
    next();
  };
};

// Cache statistics
const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses) * 100
  };
};

// Clear all cache
const clearCache = () => {
  cache.flushAll();
  logger.info('Cache cleared');
};

// Cache health check
const cacheHealth = () => {
  try {
    const stats = getCacheStats();
    return {
      status: 'healthy',
      stats,
      memory: process.memoryUsage()
    };
  } catch (error) {
    logger.error('Cache health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  getCacheStats,
  clearCache,
  cacheHealth
};
