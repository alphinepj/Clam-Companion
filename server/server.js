// server/server.js - Enhanced Calm Companion Chat App Server v3.1.0 (with Firebase & Settings)

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const winston = require('winston');
require('dotenv').config();
const { admin, db } = require('./firebase'); // Import Firebase config
const { calmCompanionFlow, toneAnalysisFlow, languageDetectionFlow } = require('./gemini');
const { generateOpenAIResponse } = require('./openai');
const { generateAnthropicResponse } = require('./anthropic');

// Configure logging (same as before)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'calm-companion-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security, Compression, CORS, Rate Limiting Middleware (same as before)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:5500"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});
app.use('/api/', limiter);
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// --- Firebase Integration ---
const usersCollection = db.collection('users');
const conversationsCollection = db.collection('conversations');

// JWT Authentication Middleware (same as before)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication attempt without token', { ip: req.ip });
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt', { ip: req.ip, error: err.message });
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
    req.user = user;
    next();
  });
};

// Input validation middleware (same as before)
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Register Route (with Firebase)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password || !validateEmail(email) || !validatePassword(password)) {
      return res.status(400).json({ error: 'Invalid email or password format', code: 'VALIDATION_ERROR' });
    }

    const userSnapshot = await usersCollection.where('email', '==', email).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ error: 'User already exists', code: 'USER_EXISTS' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUserRef = await usersCollection.add({
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      conversationCount: 0,
      settings: {
        defaultModel: 'gemini',
        defaultVoiceOutput: false
      }
    });

    const token = jwt.sign(
      { userId: newUserRef.id, email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    logger.info('New user registered', { email });
    res.status(201).json({ message: 'User registered successfully', token });
  } catch (err) {
    logger.error('Registration error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error during registration', code: 'SERVER_ERROR' });
  }
});

// Login Route (with Firebase)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
    }

    const userSnapshot = await usersCollection.where('email', '==', email).get();
    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    await usersCollection.doc(userDoc.id).update({ lastLogin: new Date().toISOString() });

    const token = jwt.sign(
      { userId: userDoc.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    logger.info('User logged in successfully', { email: user.email });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error during login', code: 'SERVER_ERROR' });
  }
});

// Chat Route (with Firebase)
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, goal, conversationId } = req.body;
    if (!message || !goal) {
      return res.status(400).json({ error: 'Message and goal are required', code: 'VALIDATION_ERROR' });
    }

    let conversationRef;
    if (conversationId) {
      conversationRef = conversationsCollection.doc(conversationId);
    } else {
      conversationRef = conversationsCollection.doc();
      await usersCollection.doc(req.user.userId).update({ conversationCount: admin.firestore.FieldValue.increment(1) });
    }
    
    const userMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
    await conversationRef.collection('messages').add(userMessage);

    const conversationSnapshot = await conversationRef.get();
    const conversationData = conversationSnapshot.data() || { goal, userId: req.user.userId, createdAt: new Date().toISOString() };
    
    // Get last 10 messages for context
    const messagesSnapshot = await conversationRef.collection('messages').orderBy('timestamp', 'desc').limit(10).get();
    const conversationHistory = messagesSnapshot.docs.map(doc => doc.data()).reverse();

    const userDoc = await usersCollection.doc(req.user.userId).get();
    const userSettings = userDoc.data().settings || {};
    const preferredProvider = userSettings.defaultModel || 'gemini';

    const aiResponse = await generateAIResponse(message, goal, 'neutral', conversationHistory, 'en', preferredProvider);
    const aiMessage = { role: 'assistant', content: aiResponse.response, timestamp: new Date().toISOString() };
    await conversationRef.collection('messages').add(aiMessage);
    
    if (!conversationSnapshot.exists) {
        await conversationRef.set(conversationData);
    }

    res.json({ response: aiResponse.response, conversationId: conversationRef.id });
  } catch (err) {
    logger.error('Chat error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error during chat', code: 'SERVER_ERROR' });
  }
});

// Get User Profile (with Firebase)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userDoc = await usersCollection.doc(req.user.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    const user = userDoc.data();

    const conversationsSnapshot = await conversationsCollection.where('userId', '==', req.user.userId).get();
    const totalMessages = (await Promise.all(conversationsSnapshot.docs.map(async doc => (await doc.ref.collection('messages').get()).size))).reduce((a, b) => a + b, 0);

    res.json({
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      conversationCount: user.conversationCount,
      totalMessages
    });
  } catch (err) {
    logger.error('Profile error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error fetching profile', code: 'SERVER_ERROR' });
  }
});

// Get User Settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const userDoc = await usersCollection.doc(req.user.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    const user = userDoc.data();
    res.json(user.settings || { defaultModel: 'gemini', defaultVoiceOutput: false });
  } catch (err) {
    logger.error('Settings GET error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error fetching settings', code: 'SERVER_ERROR' });
  }
});

// Update User Settings
app.post('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { defaultModel, defaultVoiceOutput } = req.body;
    const settings = {
      defaultModel: defaultModel || 'gemini',
      defaultVoiceOutput: defaultVoiceOutput || false
    };
    await usersCollection.doc(req.user.userId).update({ settings });
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    logger.error('Settings POST error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Server error updating settings', code: 'SERVER_ERROR' });
  }
});

// Get Conversation History (with Firebase)
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const conversationsSnapshot = await conversationsCollection
        .where('userId', '==', req.user.userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

    const conversations = conversationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const totalConversations = (await conversationsCollection.where('userId', '==', req.user.userId).get()).size;

    res.json({
        conversations,
        pagination: {
            page,
            limit,
            total: totalConversations,
            totalPages: Math.ceil(totalConversations / limit)
        }
    });
  } catch (err) {
    logger.error('Conversations error', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      error: 'Server error fetching conversations',
      code: 'SERVER_ERROR'
    });
  }
});

// Health check and other routes (same as before)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.1.0',
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🌿 Calm Companion Chat App API v3.1.0',
    status: 'running',
    version: '3.1.0',
    environment: NODE_ENV
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});


// AI Response Generation (same as before)
async function generateAIResponse(message, goal, tone, conversationHistory, language, preferredProvider) {
  const providers = {
    openai: generateOpenAIResponse,
    gemini: async (message, goal, tone, conversationHistory, language) => calmCompanionFlow.run({ message, goal, tone, conversationHistory, language }),
    anthropic: generateAnthropicResponse,
  };

  const providerOrder = preferredProvider 
    ? [preferredProvider, ...Object.keys(providers).filter(p => p !== preferredProvider)]
    : Object.keys(providers);

  for (const provider of providerOrder) {
    try {
      logger.info(`Attempting to generate response with ${provider} in ${language}`);
      const result = await providers[provider](message, goal, tone, conversationHistory, language);
      logger.info(`Successfully generated response with ${provider} in ${language}`);
      return { ...result, aiProvider: provider };
    } catch (error) {
      logger.error(`Error generating AI response with ${provider} in ${language}:`, { 
          error: error.message, 
          stack: error.stack,
      });
    }
  }
  
  return {
    response: 'I am having trouble understanding you right now. Please try again later.',
    tone: 'error',
    aiProvider: 'none'
  };
}

// Start server and graceful shutdown (same as before)
const server = app.listen(PORT, () => {
  logger.info(`🌿 Calm Companion Server v3.1.0 running on port ${PORT}`, {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
