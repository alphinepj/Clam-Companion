const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const Conversation = require('../models/Conversation');
const { logger } = require('../config/db');

// Validation middleware
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('goal')
    .trim()
    .isIn(['emotional-support', 'stress-relief', 'polite-greetings', 'kind-disagreement', 'respectful-questions'])
    .withMessage('Invalid goal specified'),
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid conversation ID format')
];

// @route   POST api/chat
// @desc    Send a message and get AI response
// @access  Private
router.post('/', auth, validateChatMessage, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Chat message validation failed', {
        userId: req.user.id,
        errors: errors.array()
      });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { message, goal, conversationId } = req.body;
    const userId = req.user.id;

    let conversation;
    
    // Find or create conversation
    if (conversationId) {
      conversation = await Conversation.findOne({ 
        _id: conversationId, 
        userId: userId 
      });
      
      if (!conversation) {
        logger.warn('Conversation not found or access denied', {
          userId,
          conversationId,
          ip: req.ip
        });
        return res.status(404).json({ 
          error: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        });
      }
    } else {
      // Create new conversation
      conversation = new Conversation({ 
        userId, 
        goal, 
        messages: [],
        createdAt: new Date()
      });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    conversation.messages.push(userMessage);

    // Generate AI response (placeholder - integrate with actual AI service)
    const aiResponse = await generateAIResponse(message, goal, conversation.messages);
    
    // Add AI response
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };
    
    conversation.messages.push(aiMessage);

    // Save conversation
    await conversation.save();

    // Invalidate user's conversation cache
    invalidateCache(`conversations_${userId}`);

    logger.info('Chat message processed successfully', {
      userId,
      conversationId: conversation._id,
      messageLength: message.length,
      goal
    });

    res.json({
      response: aiResponse,
      conversationId: conversation._id,
      messageId: aiMessage._id,
      timestamp: aiMessage.timestamp
    });

  } catch (err) {
    logger.error('Chat error', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user.id,
      ip: req.ip
    });
    res.status(500).json({ 
      error: 'Server error during chat processing',
      code: 'SERVER_ERROR'
    });
  }
});

// @route   GET api/chat/:conversationId
// @desc    Get conversation history
// @access  Private
router.get('/:conversationId', auth, cacheMiddleware(300), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Validate conversation ID
    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        error: 'Invalid conversation ID format',
        code: 'INVALID_ID'
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId
    }).select('-__v');

    if (!conversation) {
      logger.warn('Conversation not found', {
        userId,
        conversationId,
        ip: req.ip
      });
      return res.status(404).json({ 
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    logger.info('Conversation retrieved successfully', {
      userId,
      conversationId,
      messageCount: conversation.messages.length
    });

    res.json({
      conversation: {
        id: conversation._id,
        goal: conversation.goal,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });

  } catch (err) {
    logger.error('Get conversation error', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user.id,
      conversationId: req.params.conversationId
    });
    res.status(500).json({ 
      error: 'Server error fetching conversation',
      code: 'SERVER_ERROR'
    });
  }
});

// @route   GET api/chat
// @desc    Get user's conversations list
// @access  Private
router.get('/', auth, cacheMiddleware(600), async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return res.status(400).json({ 
        error: 'Invalid pagination parameters',
        code: 'INVALID_PAGINATION'
      });
    }

    const conversations = await Conversation.find({ userId })
      .select('goal createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Conversation.countDocuments({ userId });

    // Transform conversations to include message count and last message
    const transformedConversations = conversations.map(conv => ({
      id: conv._id,
      goal: conv.goal,
      messageCount: conv.messages.length,
      lastMessage: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }));

    logger.info('Conversations list retrieved successfully', {
      userId,
      page,
      limit,
      total,
      returned: conversations.length
    });

    res.json({
      conversations: transformedConversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (err) {
    logger.error('Get conversations list error', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user.id
    });
    res.status(500).json({ 
      error: 'Server error fetching conversations',
      code: 'SERVER_ERROR'
    });
  }
});

// @route   DELETE api/chat/:conversationId
// @desc    Delete a conversation
// @access  Private
router.delete('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Validate conversation ID
    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        error: 'Invalid conversation ID format',
        code: 'INVALID_ID'
      });
    }

    const conversation = await Conversation.findOneAndDelete({
      _id: conversationId,
      userId: userId
    });

    if (!conversation) {
      logger.warn('Conversation not found for deletion', {
        userId,
        conversationId,
        ip: req.ip
      });
      return res.status(404).json({ 
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    // Invalidate user's conversation cache
    invalidateCache(`conversations_${userId}`);

    logger.info('Conversation deleted successfully', {
      userId,
      conversationId
    });

    res.json({ 
      message: 'Conversation deleted successfully',
      conversationId
    });

  } catch (err) {
    logger.error('Delete conversation error', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user.id,
      conversationId: req.params.conversationId
    });
    res.status(500).json({ 
      error: 'Server error deleting conversation',
      code: 'SERVER_ERROR'
    });
  }
});

// AI Response Generation (placeholder - integrate with actual AI service)
async function generateAIResponse(message, goal, conversationHistory) {
  // This is a placeholder implementation
  // In a real application, you would integrate with OpenAI, Gemini, or other AI services
  
  const responses = {
    'emotional-support': 'I understand how you\'re feeling. It\'s completely normal to experience these emotions. Remember that you\'re not alone, and it\'s okay to feel this way.',
    'stress-relief': 'Let\'s take a moment to breathe together. Try taking a deep breath in for 4 counts, hold for 4, and exhale for 4. This simple technique can help reduce stress.',
    'polite-greetings': 'Hello! It\'s wonderful to meet you. I hope you\'re having a great day. How can I assist you today?',
    'kind-disagreement': 'I appreciate your perspective, and I can see where you\'re coming from. I have a slightly different view on this, but I respect your opinion.',
    'respectful-questions': 'That\'s an interesting point. Could you help me understand more about your perspective on this? I\'d love to learn from your experience.'
  };

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return responses[goal] || 'I\'m here to help you. How can I assist you today?';
}

module.exports = router;
