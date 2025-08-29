# 🌿 Calm Companion Chat App v2.1.0

A comprehensive, browser-based AI assistant designed to foster positive communication, emotional well-being, and mindfulness. Built with modern web technologies, enhanced security, and optimized performance for the best user experience.

## ✨ Enhanced Features

### 🎯 Goal-Based Conversations
- **Polite Greetings in English**: Practice friendly conversation starters
- **Kind Ways to Disagree**: Learn respectful disagreement techniques
- **Respectful Questions in Japanese**: Master polite language patterns
- **Emotional Support**: Receive compassionate responses and understanding
- **Stress Relief Techniques**: Learn calming strategies and mindfulness

### 😊 Advanced Emotional Intelligence
- **Real-time Tone Detection**: Enhanced keyword analysis with excitement indicators
- **Contextual Responses**: AI adapts based on conversation history and emotional patterns
- **Visual Feedback**: Dynamic emoji and description changes based on detected emotions
- **Personalized Interactions**: Responses tailored to user's emotional state and conversation goals

### 🧘 Meditation & Wellness Features
- **Meditation Timer**: Customizable timer with preset durations (5, 10, 15, 20 minutes)
- **Breathing Exercises**: Guided breathing with visual circle animation
- **Ambient Sounds**: Rain, forest, ocean, and fire sound options
- **Session Tracking**: Complete meditation sessions with gentle notifications

### 📊 User Analytics & Progress
- **Conversation History**: View past conversations with timestamps and message counts
- **Activity Statistics**: Track conversations, messages, and days active
- **Favorite Goals**: Discover your most-used conversation types
- **Profile Dashboard**: Comprehensive user statistics and progress tracking

### 🎨 Enhanced User Experience
- **Smooth Animations**: Subtle hover effects, loading states, and transitions
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Accessibility**: Focus indicators, reduced motion support, and keyboard navigation
- **Error Handling**: Graceful error messages and recovery mechanisms
- **Offline Support**: Service worker for offline functionality and caching

### 🔐 Advanced Security
- **Rate Limiting**: 100 requests per 15-minute window with enhanced protection
- **Enhanced Validation**: Email format and password strength validation
- **Extended Sessions**: 7-day JWT tokens for better user experience
- **Input Sanitization**: XSS prevention and secure data handling
- **Security Headers**: Helmet.js for comprehensive security protection
- **CORS Configuration**: Proper cross-origin resource sharing setup

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Modern web browser with ES2021 support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CompanionApp
   ```

2. **Run the startup script**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

   The startup script will:
   - Check system requirements
   - Install dependencies
   - Create configuration files
   - Start both server and frontend
   - Verify everything is working

3. **Access the application**
   - Open your browser and go to `http://localhost:5500`
   - Register a new account or login
   - Start chatting with your Calm Companion!

### Manual Setup (Alternative)

1. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Create a .env file in the server directory
   cp env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

4. **Serve the frontend**
   ```bash
   # From the project root, serve the public directory
   cd public
   python3 -m http.server 5500
   # or use Live Server extension in VS Code
   ```

## 🏗️ Enhanced Architecture

### Frontend (Client-Side)
- **HTML5/CSS3/JavaScript**: Vanilla JS with modern ES2021 features
- **Responsive Design**: CSS Grid and Flexbox for mobile-first approach
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Local Storage**: JWT token management and session persistence
- **Real-time Updates**: Dynamic UI updates and smooth animations
- **Service Worker**: Offline support and caching strategies
- **Performance Monitoring**: Built-in performance tracking

### Backend (Server-Side)
- **Node.js/Express**: RESTful API server with enhanced error handling
- **JWT Authentication**: Secure token-based authentication with extended sessions
- **bcrypt**: Password hashing with increased security rounds
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Protection against abuse and spam
- **Compression**: Gzip compression for better performance
- **Logging**: Winston logger with file and console output
- **Security Headers**: Helmet.js for comprehensive protection

### AI Integration (Enhanced)
- **Contextual Responses**: AI considers conversation history and emotional context
- **Goal-Based Prompts**: Specialized responses for different conversation types
- **Emotional Adaptation**: Responses adjust based on detected user emotions
- **Multi-language Support**: Japanese responses for respectful questions goal

## 📁 Updated Project Structure

```
CompanionApp/
├── public/                 # Frontend files
│   ├── index.html         # Main chat interface
│   ├── login.html         # Enhanced login page
│   ├── register.html      # Enhanced registration page
│   ├── profile.html       # Enhanced user profile page
│   ├── meditation.html    # Meditation timer and breathing exercises
│   ├── style.css          # Enhanced stylesheet with animations
│   ├── chat.js            # Enhanced chat functionality
│   └── sw.js              # Service worker for offline support
├── server/                # Backend files
│   ├── server.js          # Enhanced Express server
│   ├── package.json       # Updated dependencies
│   ├── env.example        # Environment template
│   ├── logs/              # Log files directory
│   └── node_modules/      # Dependencies
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── start.sh               # Enhanced startup script
└── README.md             # Comprehensive documentation
```

## 🔧 Enhanced API Endpoints

### Authentication
- `POST /api/register` - User registration with validation
- `POST /api/login` - User authentication with extended sessions

### Chat (Protected)
- `POST /api/chat` - AI conversation with conversation tracking
- `GET /api/profile` - User profile and statistics
- `GET /api/conversations` - Conversation history with pagination

### Health Check
- `GET /api/health` - Server status with version information
- `GET /` - API documentation and status

## 🎨 Enhanced Design Philosophy

### Calm Visual Design
- **Color Palette**: Soft blues, greens, and purples with gentle gradients
- **Typography**: Inter font family for optimal readability
- **Spacing**: Generous whitespace for breathing room and focus
- **Animations**: Subtle, smooth transitions that don't distract
- **Icons**: Gentle emoji usage for emotional connection

### User Experience
- **Progressive Disclosure**: Information revealed as needed
- **Error Prevention**: Clear validation and helpful error messages
- **Accessibility**: High contrast ratios, keyboard navigation, and screen reader support
- **Mobile-First**: Responsive design that works on all screen sizes
- **Performance**: Optimized loading times and smooth interactions
- **Offline Support**: Graceful degradation when network is unavailable

## 🛠️ Development Tools

### Code Quality
- **ESLint**: JavaScript linting with comprehensive rules
- **Prettier**: Code formatting for consistency
- **Nodemon**: Auto-restart server during development

### Development Commands
```bash
# Start development server with auto-reload
npm run dev

# Lint code for quality
npm run lint

# Format code with Prettier
npm run format

# Check for security vulnerabilities
npm run security-check

# Clean and reinstall dependencies
npm run clean
```

### Performance Monitoring
- Built-in performance tracking
- Service worker caching strategies
- Compression middleware
- Request timeout handling

## 🔮 Future Enhancements

### Phase 3: Advanced AI Integration
- [ ] OpenAI GPT-4 API integration
- [ ] Google Gemini API integration
- [ ] Anthropic Claude API integration
- [ ] Advanced emotion classification models
- [ ] Multi-language support expansion

### Phase 4: Advanced Features
- [ ] Voice input/output capabilities
- [ ] Real-time audio for meditation sounds
- [ ] Custom conversation goals
- [ ] Group meditation sessions
- [ ] Progress analytics and insights

### Phase 5: Database & Scaling
- [ ] MongoDB/Firebase integration
- [ ] User preferences and settings
- [ ] Advanced conversation analytics
- [ ] Social features and sharing
- [ ] Cloud deployment and scaling

## 🛡️ Enhanced Security Considerations

### Current Implementation
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT token authentication (7-day expiration)
- ✅ CORS configuration and validation
- ✅ Input validation and sanitization
- ✅ Rate limiting (100 requests/15min)
- ✅ Enhanced error handling
- ✅ Security headers (Helmet.js)
- ✅ Request compression
- ✅ Comprehensive logging

### Planned Security Features
- [ ] CSRF protection
- [ ] Advanced XSS prevention
- [ ] API key management
- [ ] Environment-based configuration
- [ ] Security headers implementation

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

### Development Guidelines
1. Follow the existing code style and patterns
2. Add comprehensive comments for complex logic
3. Test your changes thoroughly across devices
4. Update documentation as needed
5. Consider accessibility and performance implications
6. Run linting and formatting before submitting

### Code Style
- Use ESLint for JavaScript linting
- Use Prettier for code formatting
- Follow semantic commit messages
- Include tests for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Inter Font**: Beautiful typography by Rasmus Andersson
- **Emoji**: Unicode emoji for emotional expression
- **OpenAI**: Inspiration for AI conversation design
- **Community**: All users and contributors who make this project better

## 📞 Support

If you have any questions or need help, please:
1. Check the comprehensive documentation
2. Search existing issues for solutions
3. Create a new issue with detailed information
4. Contact the development team

## 🔄 Changelog

### v2.1.0 (Current)
- ✨ Enhanced security with Helmet.js and improved rate limiting
- 🚀 Added service worker for offline support
- 📱 Improved responsive design and accessibility
- 🔧 Enhanced development tools (ESLint, Prettier)
- 📊 Better error handling and logging
- 🎨 Modernized UI with improved forms and validation
- ⚡ Performance optimizations and compression

### v2.0.0
- 🎯 Goal-based conversation system
- 😊 Emotional intelligence features
- 🧘 Meditation and wellness tools
- 📊 User analytics and progress tracking
- 🎨 Enhanced user experience

---

**Made with ❤️ for better communication, emotional well-being, and mindfulness**
# Clam-Companion
