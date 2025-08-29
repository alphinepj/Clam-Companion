const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { logger } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// Validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Registration validation failed', {
        ip: req.ip,
        errors: errors.array()
      });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      logger.warn('Registration attempt with existing email', { email, ip: req.ip });
      return res.status(400).json({ 
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create new user
    user = new User({
      email,
      password
    });

    // Hash password with higher salt rounds for better security
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        email: user.email
      }
    };

    // Generate JWT token with longer expiration
    const token = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '7d',
      issuer: 'mindfulness-app',
      audience: 'mindfulness-app-users'
    });

    logger.info('New user registered successfully', { 
      userId: user.id, 
      email: user.email,
      ip: req.ip 
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    logger.error('Registration error', { 
      error: err.message, 
      stack: err.stack,
      ip: req.ip 
    });
    res.status(500).json({ 
      error: 'Server error during registration',
      code: 'SERVER_ERROR'
    });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Login validation failed', {
        ip: req.ip,
        errors: errors.array()
      });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login attempt with non-existent email', { email, ip: req.ip });
      return res.status(400).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Login attempt with wrong password', { email, ip: req.ip });
      return res.status(400).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        email: user.email
      }
    };

    // Generate JWT token
    const token = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '7d',
      issuer: 'mindfulness-app',
      audience: 'mindfulness-app-users'
    });

    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email,
      ip: req.ip 
    });

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
    logger.error('Login error', { 
      error: err.message, 
      stack: err.stack,
      ip: req.ip 
    });
    res.status(500).json({ 
      error: 'Server error during login',
      code: 'SERVER_ERROR'
    });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ 
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (err) {
    logger.warn('Token verification failed', { 
      error: err.message,
      ip: req.ip 
    });
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
});

module.exports = router;
