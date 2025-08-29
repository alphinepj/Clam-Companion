const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectDB, logger } = require('./config/db');
const { metricsMiddleware, metricsEndpoint, healthCheckWithMetrics } = require('./middleware/metrics');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] 
      : ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:5500"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] 
    : ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Logging middleware
app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
}));

// Metrics middleware (apply before other middleware)
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Static file serving with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// Health check endpoint with metrics
app.get('/api/health', healthCheckWithMetrics);

// Metrics endpoint for Prometheus
app.get('/api/metrics', metricsEndpoint);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Join meditation session
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    logger.info('User joined session', { socketId: socket.id, sessionId });
    io.to(sessionId).emit('user-joined', { socketId: socket.id });
  });

  // Leave meditation session
  socket.on('leave-session', (sessionId) => {
    socket.leave(sessionId);
    logger.info('User left session', { socketId: socket.id, sessionId });
    io.to(sessionId).emit('user-left', { socketId: socket.id });
  });

  // Start meditation session
  socket.on('start-session', (sessionId) => {
    logger.info('Session started', { socketId: socket.id, sessionId });
    io.to(sessionId).emit('session-started', { sessionId });
  });

  // Pause meditation session
  socket.on('pause-session', (sessionId) => {
    logger.info('Session paused', { socketId: socket.id, sessionId });
    io.to(sessionId).emit('session-paused', { sessionId });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/meditation', require('./routes/meditation'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/community', require('./routes/community'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🌿 Mindfulness App API v2.0.0',
    status: 'running',
    version: '2.0.0',
    environment: NODE_ENV,
    documentation: '/api/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Endpoint not found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Don't leak error details in production
  const errorMessage = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(500).json({
    error: errorMessage,
    code: 'INTERNAL_ERROR',
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Mindfulness App Server v2.0.0 running on port ${PORT}`, {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

module.exports = app;
