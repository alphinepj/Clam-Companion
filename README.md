# 🌿 Calm Companion - Mindfulness & Meditation App

A modern, soothing mindfulness and meditation application with AI-powered chat, group meditation sessions, analytics, and community features.

## ✨ Features

- **🤖 AI-Powered Chat**: Intelligent conversations for mental wellness
- **🧘 Solo Meditation**: Personalized meditation timer with nature sounds
- **👥 Group Meditation**: Real-time group sessions with Socket.IO
- **📊 Analytics**: Track your mindfulness journey with detailed insights
- **👤 Profile Management**: Comprehensive user profiles and settings
- **🌱 Community**: Connect with like-minded individuals
- **📱 PWA Ready**: Progressive Web App with offline capabilities
- **🎨 Modern UI**: Soothing, nature-inspired design system

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher)
- **Git**

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd CompanionApp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/calm_companion

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-here

# Optional: Redis for caching (recommended for production)
REDIS_URL=redis://localhost:6379

# Optional: Frontend URL for CORS
FRONTEND_URL=http://localhost:5500
```

### 4. Start MongoDB

**Option A: Local MongoDB**
```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

**Option B: Docker MongoDB**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Run the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

### 6. Access the Application

Open your browser and navigate to:
- **Main App**: `http://localhost:5000`
- **API Documentation**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/api/health`
- **Metrics**: `http://localhost:5000/api/metrics`

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build the image
docker build -t calm-companion .

# Run the container
docker run -p 5000:5000 --env-file .env calm-companion
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/auth.test.js
```

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run security-check` - Run security audit
- `npm run clean` - Clean and reinstall dependencies

## 📁 Project Structure

```
CompanionApp/
├── config/                 # Configuration files
│   └── db.js              # Database connection
├── middleware/             # Express middleware
│   ├── auth.js            # Authentication middleware
│   ├── cache.js           # Caching middleware
│   └── metrics.js         # Prometheus metrics
├── models/                 # Mongoose models
│   └── User.js            # User model
├── public/                 # Frontend files
│   ├── *.html             # HTML pages
│   ├── style.css          # Main stylesheet
│   ├── *.js               # Frontend JavaScript
│   └── sw.js              # Service Worker
├── routes/                 # API routes
│   ├── auth.js            # Authentication routes
│   ├── chat.js            # Chat routes
│   └── ...                # Other route files
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── app.js                  # Main application file
├── package.json           # Dependencies and scripts
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker configuration
└── README.md              # This file
```

## 🔐 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: API request throttling
- **Input Validation**: Express-validator integration
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with high salt rounds
- **CORS Protection**: Cross-origin resource sharing
- **Content Security Policy**: XSS protection

## 📊 Monitoring & Performance

- **Winston Logging**: Structured logging
- **Prometheus Metrics**: Application metrics
- **Health Checks**: System health monitoring
- **Compression**: Gzip response compression
- **Caching**: Redis and in-memory caching
- **Database Optimization**: Connection pooling and indexing

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Chat
- `POST /api/chat` - Send message
- `GET /api/chat` - Get conversation history
- `DELETE /api/chat/:id` - Delete conversation

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Meditation
- `POST /api/meditation/session` - Create meditation session
- `GET /api/meditation/sessions` - Get user sessions

### Analytics
- `GET /api/analytics` - Get user analytics
- `POST /api/analytics/event` - Track user event

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

### Community
- `GET /api/community/posts` - Get community posts
- `POST /api/community/posts` - Create post

## 🚀 Deployment

### Production Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
REDIS_URL=redis://your-production-redis-uri
FRONTEND_URL=https://yourdomain.com
```

### Using Docker Compose (Production)

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set up environment variables**

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Set up reverse proxy (Nginx)**
   - Use the provided `nginx.conf` file
   - Configure SSL certificates
   - Set up load balancing if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the logs: `npm run dev` or `docker-compose logs`
3. Check the health endpoint: `http://localhost:5000/api/health`
4. Verify your environment variables
5. Ensure MongoDB is running

## 🔄 Updates

To update the application:

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run tests
npm test

# Restart the application
npm run dev
```

---

**🌿 Built with love for mental wellness and mindfulness**

