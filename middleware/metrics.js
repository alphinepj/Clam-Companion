const promClient = require('prom-client');
const { logger } = require('../config/db');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestInProgress = new promClient.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route']
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const cacheHitRatio = new promClient.Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio (0-1)'
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestInProgress);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitRatio);
register.registerMetric(activeConnections);
register.registerMetric(memoryUsage);

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const route = req.route ? req.route.path : req.path;

  // Increment requests in progress
  httpRequestInProgress.inc({ method, route });

  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDurationMicroseconds.observe({ method, route, status_code: statusCode }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode });
    httpRequestInProgress.dec({ method, route });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query timing middleware
const dbMetricsMiddleware = (operation, collection) => {
  return (req, res, next) => {
    const start = Date.now();
    
    // Override res.end to capture timing
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation, collection }, duration);
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};

// Cache metrics middleware
const cacheMetricsMiddleware = (cache) => {
  return (req, res, next) => {
    // Update cache hit ratio every 30 seconds
    setInterval(() => {
      try {
        const stats = cache.getStats();
        const hitRatio = stats.hits / (stats.hits + stats.misses);
        cacheHitRatio.set(hitRatio);
      } catch (error) {
        logger.error('Error updating cache metrics:', error);
      }
    }, 30000);
    
    next();
  };
};

// System metrics middleware
const systemMetricsMiddleware = () => {
  return (req, res, next) => {
    // Update system metrics every 30 seconds
    setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        memoryUsage.set({ type: 'rss' }, memUsage.rss);
        memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
        memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
        memoryUsage.set({ type: 'external' }, memUsage.external);
        
        // Update active connections (placeholder - implement based on your connection tracking)
        activeConnections.set(0);
      } catch (error) {
        logger.error('Error updating system metrics:', error);
      }
    }, 30000);
    
    next();
  };
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
};

// Health check endpoint with metrics
const healthCheckWithMetrics = async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
      metrics: {
        cacheHitRatio: cacheHitRatio.get(),
        activeConnections: activeConnections.get(),
        memoryUsage: {
          rss: memoryUsage.get({ type: 'rss' }),
          heapUsed: memoryUsage.get({ type: 'heapUsed' }),
          heapTotal: memoryUsage.get({ type: 'heapTotal' })
        }
      }
    };
    
    res.json(healthData);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};

module.exports = {
  metricsMiddleware,
  dbMetricsMiddleware,
  cacheMetricsMiddleware,
  systemMetricsMiddleware,
  metricsEndpoint,
  healthCheckWithMetrics,
  register,
  // Export metrics for direct access
  httpRequestDurationMicroseconds,
  httpRequestTotal,
  httpRequestInProgress,
  databaseQueryDuration,
  cacheHitRatio,
  activeConnections,
  memoryUsage
};
