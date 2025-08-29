// server/server.js - Enhanced Calm Companion Chat App Server v2.1.0

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

// ✅ Chat Route with enhanced AI response
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, goal, tone, conversationId } = req.body;
    
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

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      tone: tone || 'neutral'
    };
    conversation.messages.push(userMessage);

    // Generate AI response
    const aiResponse = await generateAIResponse(message, goal, tone, conversation.messages);
    
    // Add AI message
    const aiMessage = {
      role: 'assistant',
      content: aiResponse.response,
      timestamp: new Date().toISOString(),
      tone: aiResponse.tone
    };
    conversation.messages.push(aiMessage);

    logger.info('Chat message processed', { 
      userId: req.user.userId, 
      goal, 
      messageLength: message.length 
    });

    res.json({
      response: aiResponse.response,
      conversationId: conversation.id,
      tone: aiResponse.tone
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
    version: '2.1.0',
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🌿 Calm Companion Chat App API v2.1.0',
    status: 'running',
    version: '2.1.0',
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

// ✅ Enhanced AI Response Generation
async function generateAIResponse(message, goal, tone, conversationHistory) {
  // Enhanced response system with better context awareness
  const responses = getGoalBasedResponses(goal, tone);
  
  // Add conversation context
  const context = buildConversationContext(conversationHistory, goal);
  
  // Simulate API delay (will be replaced with real API calls)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  // Generate contextual response
  const response = generateContextualResponse(message, responses, tone, context);
  
  return {
    response,
    tone: tone || 'neutral'
  };
}

function buildConversationContext(history, goal) {
  const recentMessages = history.slice(-4); // Last 4 messages for context
  const userTones = recentMessages
    .filter(m => m.role === 'user')
    .map(m => m.tone);
  
  return {
    recentTones: userTones,
    goal,
    messageCount: history.length,
    isFirstMessage: history.length === 1
  };
}

function generateContextualResponse(message, responses, tone, context) {
  let response = responses[Math.floor(Math.random() * responses.length)];
  
  // Add contextual elements
  if (context.isFirstMessage) {
    response = `Hello! I'm here to help you with ${context.goal.replace('-', ' ')}. ${response}`;
  }
  
  // Add tone-specific elements
  if (tone === 'excited') {
    response += ' I can feel your enthusiasm! 🌟';
  } else if (tone === 'stressed') {
    response += ' Remember to take deep breaths. You are doing great! 💚';
  }
  
  return response;
}

// ✅ Goal-based response system
function getGoalBasedResponses(goal, tone) {
  const responses = {
    'polite-greetings': [
      "Hello! It's wonderful to meet you. How are you doing today?",
      "Hi there! I hope you're having a lovely day. What brings you here?",
      "Greetings! I'm so glad you stopped by. How can I help you today?",
      "Hello! Welcome to our conversation. I'm here to chat and support you."
    ],
    'kind-disagreement': [
      "I understand your perspective, and I appreciate you sharing it with me.",
      "That's an interesting point of view. Let me think about that for a moment.",
      "I see where you're coming from, and I respect your opinion on this.",
      "Thank you for sharing that. It's important to consider different viewpoints."
    ],
    'respectful-questions': [
      "I'd love to learn more about that. Could you tell me a bit more?",
      "That sounds fascinating! Would you mind sharing more details?",
      "I'm curious about your experience. What was that like for you?",
      "Thank you for sharing. How did that make you feel?"
    ],
    'emotional-support': [
      "I hear you, and I want you to know that your feelings are valid.",
      "It sounds like you're going through a lot right now. I'm here for you.",
      "You're not alone in this. I'm here to listen and support you.",
      "Thank you for trusting me with this. You're showing real strength."
    ],
    'stress-relief': [
      "Let's take a moment to breathe together. Inhale slowly... and exhale.",
      "Remember, it's okay to take breaks and be kind to yourself.",
      "You're doing the best you can, and that's enough.",
      "Let's focus on one thing at a time. What feels most important right now?"
    ]
  };
  
  return responses[goal] || responses['emotional-support'];
}

// ✅ Start server with enhanced error handling
const server = app.listen(PORT, () => {
  logger.info(`🌿 Calm Companion Server v2.1.0 running on port ${PORT}`, {
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
