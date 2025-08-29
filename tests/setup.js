// Test setup file for Jest

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGO_URI = 'mongodb://localhost:27017/mindfulness_app_test';
process.env.PORT = 5001;

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }),

  // Generate test conversation data
  generateTestConversation: (overrides = {}) => ({
    goal: 'stress-relief',
    messages: [
      {
        role: 'user',
        content: 'I am feeling stressed',
        timestamp: new Date(),
      },
    ],
    ...overrides,
  }),

  // Wait for async operations
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Mock JWT token
  generateMockToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          ...payload,
        },
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
};

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
