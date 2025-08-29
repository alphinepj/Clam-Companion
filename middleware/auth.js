const jwt = require('jsonwebtoken');
const { logger } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if no token
  if (!authHeader) {
    logger.warn('Authentication attempt without token', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ 
      error: 'No token, authorization denied',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  // Check if token format is correct
  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Invalid token format', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ 
      error: 'Invalid token format',
      code: 'AUTH_TOKEN_FORMAT'
    });
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  // Check if token exists
  if (!token) {
    logger.warn('Empty token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ 
      error: 'No token, authorization denied',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      logger.warn('Expired token used', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        userId: decoded.user?.id
      });
      return res.status(401).json({ 
        error: 'Token has expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }

    // Add user info to request
    req.user = decoded.user;
    
    // Log successful authentication
    logger.info('User authenticated successfully', {
      ip: req.ip,
      userId: decoded.user?.id,
      path: req.path
    });
    
    next();
  } catch (err) {
    logger.warn('Invalid token attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      error: err.message
    });
    
    let errorMessage = 'Token is not valid';
    let errorCode = 'AUTH_TOKEN_INVALID';
    
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
      errorCode = 'AUTH_TOKEN_EXPIRED';
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token';
      errorCode = 'AUTH_TOKEN_INVALID';
    }
    
    res.status(401).json({ 
      error: errorMessage,
      code: errorCode
    });
  }
};
