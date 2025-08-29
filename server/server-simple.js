// server/server-simple.js - Simplified working version

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());

// In-memory storage
const users = [];
const conversations = [];

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register Route
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userExists = users.find(u => u.email === email);
    if (userExists) return res.status(400).json({ message: 'User already exists' });

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
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    user.lastLogin = new Date().toISOString();

    const token = jwt.sign({ 
      email: user.email, 
      userId: user.id 
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    
    res.json({ 
      token,
      user: {
        email: user.email,
        conversationCount: user.conversationCount
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Chat Route
app.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, goal, tone } = req.body;
    
    if (!message || !goal) {
      return res.status(400).json({ message: 'Message and goal are required' });
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(message, goal, tone);
    
    // Store conversation
    const conversation = {
      id: Date.now().toString(),
      userId: req.user.userId,
      goal,
      messages: [
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
          tone: tone || 'neutral'
        },
        {
          role: 'assistant',
          content: aiResponse.response,
          timestamp: new Date().toISOString(),
          tone: aiResponse.tone
        }
      ],
      createdAt: new Date().toISOString()
    };

    conversations.push(conversation);

    // Update user conversation count
    const user = users.find(u => u.id === req.user.userId);
    if (user) {
      user.conversationCount++;
    }
    
    res.json({ 
      response: aiResponse.response,
      tone: aiResponse.tone,
      timestamp: new Date().toISOString(),
      conversationId: conversation.id
    });
    
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ message: 'Server error during chat' });
  }
});

// Profile Route
app.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userConversations = conversations.filter(c => c.userId === req.user.userId);
    
    res.json({
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      conversationCount: user.conversationCount,
      totalMessages: userConversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      favoriteGoal: 'emotional-support'
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Conversations Route
app.get('/conversations', authenticateToken, (req, res) => {
  try {
    const userConversations = conversations
      .filter(c => c.userId === req.user.userId)
      .map(c => ({
        id: c.id,
        goal: c.goal,
        messageCount: c.messages.length,
        createdAt: c.createdAt,
        lastMessage: c.messages[c.messages.length - 1]?.timestamp
      }))
      .sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage))
      .slice(0, 10);

    res.json(userConversations);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

// AI Response Generation
async function generateAIResponse(message, goal, tone) {
  const responses = {
    'polite-greetings': {
      angry: "I understand you might be feeling frustrated. Let's take a deep breath together. A polite greeting can be as simple as 'Hello, how are you today?' with a gentle smile.",
      sad: "I hear that you're feeling down. A warm greeting like 'Hello, I hope you're having a good day' can brighten both your day and someone else's.",
      anxious: "It's okay to feel nervous about greetings. Start simple: 'Hello' or 'Hi' is perfect. Remember, most people appreciate a friendly greeting.",
      happy: "Your positive energy is wonderful! Try 'Hello! How are you doing today?' or 'Good morning! I hope you're having a great day!'",
      neutral: "A simple 'Hello' or 'Good morning' is always appropriate. You can also try 'Hi there' or 'Good afternoon' depending on the time."
    },
    'emotional-support': {
      angry: "I can feel your frustration, and it's completely valid. Let's take a moment to breathe together. Your feelings matter, and it's okay to be upset.",
      sad: "I'm so sorry you're feeling this way. Your sadness is real and valid. I'm here to listen and support you through this difficult time.",
      anxious: "I understand that anxiety can feel overwhelming. Let's take this one step at a time. You're safe, and I'm here to support you.",
      happy: "I'm so glad you're feeling good! Your joy is contagious and beautiful. Keep spreading that positive energy!",
      neutral: "I'm here to listen and support you, whatever you're feeling. Your thoughts and emotions are important to me."
    },
    'stress-relief': {
      angry: "I can see you're feeling stressed and frustrated. Let's take a deep breath together. Inhale slowly for 4 counts, hold for 4, exhale for 6. You're doing great.",
      sad: "I understand stress can feel overwhelming when you're already down. Let's try a gentle breathing exercise: breathe in love, breathe out tension.",
      anxious: "I can feel your stress and anxiety. Let's try the 4-7-8 breathing technique: inhale for 4, hold for 7, exhale for 8. You're safe here.",
      happy: "Even when you're feeling good, stress can still creep in. Let's maintain that positive energy with some gentle stretching or a short walk.",
      neutral: "Stress affects us all. Let's try a simple technique: close your eyes and take 10 deep breaths, focusing only on your breath."
    }
  };

  const goalResponses = responses[goal] || responses['emotional-support'];
  const response = goalResponses[tone] || goalResponses['neutral'];
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  return {
    response,
    tone: tone || 'neutral'
  };
}

// Test Route
app.get('/', (req, res) => {
  res.json({
    message: '✅ Calm Companion Server is running',
    version: '2.0.0-simple',
    endpoints: {
      auth: ['POST /register', 'POST /login'],
      chat: ['POST /chat'],
      profile: ['GET /profile', 'GET /conversations']
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Calm Companion Server v2.0.0-simple started on http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /register - User registration`);
  console.log(`   POST /login - User authentication`);
  console.log(`   POST /chat - AI chat (requires authentication)`);
  console.log(`   GET /profile - User profile (requires authentication)`);
  console.log(`   GET /conversations - Conversation history (requires authentication)`);
});
