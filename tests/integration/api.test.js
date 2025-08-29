const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Conversation = require('../../models/Conversation');

// Mock the database connection
jest.mock('../../config/db', () => ({
  connectDB: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('API Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Clear database
    await User.deleteMany({});
    await Conversation.deleteMany({});
  });

  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
    await Conversation.deleteMany({});
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Register a new user
      const userData = testUtils.generateTestUser();
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(userData.email);

      // 2. Login with the same user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      authToken = loginResponse.body.token;

      // 3. Verify token
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('valid', true);
      expect(verifyResponse.body).toHaveProperty('user');
    });
  });

  describe('Chat Flow', () => {
    beforeEach(async () => {
      // Create a test user and get auth token
      const userData = testUtils.generateTestUser();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      authToken = registerResponse.body.token;
      testUser = registerResponse.body.user;
    });

    it('should handle complete chat conversation flow', async () => {
      // 1. Send a message and get AI response
      const chatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I am feeling stressed today',
          goal: 'stress-relief'
        })
        .expect(200);

      expect(chatResponse.body).toHaveProperty('response');
      expect(chatResponse.body).toHaveProperty('conversationId');
      expect(chatResponse.body).toHaveProperty('messageId');
      expect(chatResponse.body).toHaveProperty('timestamp');

      const conversationId = chatResponse.body.conversationId;

      // 2. Get conversation history
      const historyResponse = await request(app)
        .get(`/api/chat/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveProperty('conversation');
      expect(historyResponse.body.conversation).toHaveProperty('messages');
      expect(historyResponse.body.conversation.messages).toHaveLength(2); // User message + AI response

      // 3. Send another message in the same conversation
      const secondChatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Thank you, that helped',
          goal: 'stress-relief',
          conversationId: conversationId
        })
        .expect(200);

      expect(secondChatResponse.body).toHaveProperty('response');
      expect(secondChatResponse.body.conversationId).toBe(conversationId);

      // 4. Get updated conversation history
      const updatedHistoryResponse = await request(app)
        .get(`/api/chat/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedHistoryResponse.body.conversation.messages).toHaveLength(4); // 2 user + 2 AI messages
    });

    it('should get user conversations list', async () => {
      // Create a conversation first
      await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
          goal: 'emotional-support'
        });

      // Get conversations list
      const conversationsResponse = await request(app)
        .get('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(conversationsResponse.body).toHaveProperty('conversations');
      expect(conversationsResponse.body).toHaveProperty('pagination');
      expect(conversationsResponse.body.conversations).toHaveLength(1);
      expect(conversationsResponse.body.conversations[0]).toHaveProperty('goal', 'emotional-support');
    });

    it('should delete a conversation', async () => {
      // Create a conversation first
      const chatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
          goal: 'emotional-support'
        });

      const conversationId = chatResponse.body.conversationId;

      // Delete the conversation
      const deleteResponse = await request(app)
        .delete(`/api/chat/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('message', 'Conversation deleted successfully');
      expect(deleteResponse.body).toHaveProperty('conversationId', conversationId);

      // Verify conversation is deleted
      await request(app)
        .get(`/api/chat/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid authentication', async () => {
      const response = await request(app)
        .get('/api/chat')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'AUTH_TOKEN_INVALID');
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .get('/api/chat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'AUTH_TOKEN_MISSING');
    });

    it('should handle invalid conversation ID', async () => {
      // Create a test user and get auth token
      const userData = testUtils.generateTestUser();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      const authToken = registerResponse.body.token;

      const response = await request(app)
        .get('/api/chat/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid conversation ID format');
      expect(response.body).toHaveProperty('code', 'INVALID_ID');
    });

    it('should handle non-existent conversation', async () => {
      // Create a test user and get auth token
      const userData = testUtils.generateTestUser();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      const authToken = registerResponse.body.token;

      const response = await request(app)
        .get('/api/chat/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Conversation not found');
      expect(response.body).toHaveProperty('code', 'CONVERSATION_NOT_FOUND');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on API endpoints', async () => {
      // Create a test user and get auth token
      const userData = testUtils.generateTestUser();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      const authToken = registerResponse.body.token;

      // Make multiple requests quickly to trigger rate limiting
      const promises = Array.from({ length: 150 }, () =>
        request(app)
          .get('/api/chat')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should return health status with metrics', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });
});
