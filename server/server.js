// server/server.js - Enhanced Calm Companion Chat App Server v2.3.0

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
const { calmCompanionFlow, toneAnalysisFlow, languageDetectionFlow } = require('./gemini');
const { generateOpenAIResponse } = require('./openai');
const { generateAnthropicResponse } = require('./anthropic');

// Configure logging
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

// ✅ Security Middleware
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

// ✅ Compression middleware for better performance
app.use(compression());

// ✅ CORS configuration with enhanced security
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// ✅ Rate limiting with enhanced configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// ✅ Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ✅ In-memory "database" (will be upgraded to MongoDB)
const users = [];
const conversations = [];

// ✅ JWT Authentication Middleware with enhanced error handling
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

// ✅ Input validation middleware
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// ✅ Register Route with enhanced validation
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    const userExists = users.find(u => u.email === email);
    if (userExists) {
      logger.warn('Registration attempt with existing email', { email });
      return res.status(400).json({ 
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = { 
      id: Date.now().toString(),
      email, 
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      conversationCount: 0
    };

    users.push(newUser);
    
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    logger.info('New user registered', { email: newUser.email });
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    logger.error('Registration error', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      error: 'Server error during registration',
      code: 'SERVER_ERROR'
    });
  }
});

// ✅ Login Route with enhanced security
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn('Login attempt with wrong password', { email });
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    logger.info('User logged in successfully', { email: user.email });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      error: 'Server error during login',
      code: 'SERVER_ERROR'
    });
  }
});

// ✅ Chat Route with multi-language support
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, goal, tone, language, conversationId, aiProvider } = req.body;
    
    if (!message || !goal) {
      return res.status(400).json({ 
        error: 'Message and goal are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Find or create conversation
    let conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      conversation = {
        id: Date.now().toString(),
        userId: req.user.userId,
        goal,
        messages: [],
        createdAt: new Date().toISOString()
      };
      conversations.push(conversation);
      user.conversationCount++;
    }
    
    let detectedLanguage = language;
    if (!detectedLanguage) {
        const langResult = await languageDetectionFlow.run({ message });
        detectedLanguage = langResult.language;
    }
    
    let detectedTone = tone;
    if (!detectedTone) {
        const toneResult = await toneAnalysisFlow.run({ message, language: detectedLanguage });
        detectedTone = toneResult.tone;
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      tone: detectedTone,
      language: detectedLanguage
    };
    conversation.messages.push(userMessage);

    // Generate AI response
    const aiResponse = await generateAIResponse(message, goal, detectedTone, conversation.messages, detectedLanguage, aiProvider);
    
    // Add AI message
    const aiMessage = {
      role: 'assistant',
      content: aiResponse.response,
      timestamp: new Date().toISOString(),
      tone: aiResponse.tone,
      language: detectedLanguage
    };
    conversation.messages.push(aiMessage);

    logger.info('Chat message processed', { 
      userId: req.user.userId, 
      goal, 
      messageLength: message.length,
      aiProvider: aiResponse.aiProvider,
      language: detectedLanguage
    });

    res.json({
      response: aiResponse.response,
      conversationId: conversation.id,
      tone: aiResponse.tone,
      language: detectedLanguage,
      aiProvider: aiResponse.aiProvider
    });
  } catch (err) {
    logger.error('Chat error', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      error: 'Server error during chat',
      code: 'SERVER_ERROR'
    });
  }
});

// ✅ Get User Profile with enhanced data
app.get('/api/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userConversations = conversations.filter(c => c.userId === req.user.userId);
    
    res.json({
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      conversationCount: user.conversationCount,
      totalMessages: userConversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      favoriteGoal: getFavoriteGoal(userConversations),
      daysActive: Math.ceil((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
    });
  } catch (err) {
    logger.error('Profile error', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      error: 'Server error fetching profile',
      code: 'SERVER_ERROR'
    });
  }
});

// ✅ Get Conversation History with pagination
app.get('/api/conversations', authenticateToken, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const userConversations = conversations
      .filter(c => c.userId === req.user.userId)
      .map(c => ({
        id: c.id,
        goal: c.goal,
        messageCount: c.messages.length,
        createdAt: c.createdAt,
        lastMessage: c.messages[c.messages.length - 1]?.timestamp
      }))
      .sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));

    const paginatedConversations = userConversations.slice(offset, offset + limit);

    res.json({
      conversations: paginatedConversations,
      pagination: {
        page,
        limit,
        total: userConversations.length,
        totalPages: Math.ceil(userConversations.length / limit)
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

// ✅ Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.3.0',
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🌿 Calm Companion Chat App API v2.3.0',
    status: 'running',
    version: '2.3.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/api/health',
      register: 'POST /api/register',
      login: 'POST /api/login',
      chat: 'POST /api/chat',
      profile: 'GET /api/profile',
      conversations: 'GET /api/conversations'
    }
  });
});

// ✅ 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// ✅ Global error handler
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

// ✅ Helper function to get favorite goal
function getFavoriteGoal(conversations) {
  const goalCounts = {};
  conversations.forEach(conv => {
    goalCounts[conv.goal] = (goalCounts[conv.goal] || 0) + 1;
  });
  
  return Object.keys(goalCounts).reduce((a, b) => 
    goalCounts[a] > goalCounts[b] ? a : b, 'emotional-support'
  );
}

// ✅ AI Response Generation with smart fallbacks and multi-language support
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


// ✅ Start server with enhanced error handling
const server = app.listen(PORT, () => {
  logger.info(`🌿 Calm Companion Server v2.3.0 running on port ${PORT}`, {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ✅ Graceful shutdown
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
