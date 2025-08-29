# 🌿 Calm Companion Chat App v2.3.0

A comprehensive, browser-based AI assistant designed to foster positive communication, emotional well-being, and mindfulness. Built with modern web technologies, enhanced security, and a multi-provider AI strategy for a resilient, adaptive, and inclusive user experience.

## ✨ Core Features

### 🌐 Multi-Language & Adaptive AI
- **Automatic Language Detection**: The AI automatically identifies the user's language from their messages.
- **Multi-Language Conversations**: Engage in natural conversations as the AI responds in the user's detected language.
- **Smart AI Provider Fallbacks**: Seamlessly switches between Google Gemini, OpenAI, and Anthropic to ensure high availability and response quality.
- **Dynamic Tone Analysis**: Accurately detects the user's emotional tone, even in different languages, for more empathetic interactions.

### 🎯 Goal-Based Conversations
- **Polite Greetings in English**: Practice friendly conversation starters.
- **Kind Ways to Disagree**: Learn respectful disagreement techniques.
- **Respectful Questions in Japanese**: Master polite language patterns.
- **Emotional Support**: Receive compassionate responses and understanding.
- **Stress Relief Techniques**: Learn calming strategies and mindfulness.

### 🧘 Meditation & Wellness
- **Meditation Timer**: Customizable timer with preset durations.
- **Breathing Exercises**: Guided breathing with a calming visual animation.
- **Ambient Sounds**: A library of sounds like rain, forest, and ocean to aid relaxation.
- **Session Tracking**: Gentle notifications to mark the completion of meditation sessions.

### 📊 User Analytics & Progress
- **Conversation History**: Review past conversations with timestamps and message counts.
- **Activity Statistics**: Track total conversations, messages, and active days.
- **Favorite Goals**: Discover your most frequently used conversation topics.
- **Profile Dashboard**: A comprehensive overview of your wellness journey.

### 🔐 Advanced Security & Performance
- **Rate Limiting & Input Validation**: Protects against abuse and ensures data integrity.
- **Secure Authentication**: JWT-based authentication with 7-day sessions and hashed passwords (bcrypt).
- **Performance Optimized**: Gzip compression, service worker caching, and security headers with Helmet.js.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- A modern web browser

### Installation
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd CompanionApp
    ```
2.  **Run the startup script:**
    ```bash
    chmod +x start.sh
    ./start.sh
    ```
    The script handles dependency installation, configuration, and starts both the server and client.
3.  **Access the application:**
    Open your browser to `http://localhost:5500` to begin your journey with the Calm Companion.

## 🏗️ Enhanced Architecture

### AI Integration
- **Multi-Provider Strategy**: Integrates Google Gemini, OpenAI GPT-4, and Anthropic Claude for state-of-the-art conversational AI.
- **Smart Fallbacks**: Automatically retries with a different provider if one fails, maximizing reliability.
- **Multi-Language Support**: Detects and responds in the user's native language.
- **Contextual Understanding**: Considers conversation history, user goals, and emotional tone.
- **Dynamic Analysis**: Performs real-time tone and language analysis to provide adaptive responses.

### Backend (Server-Side)
- **Node.js/Express**: A robust RESTful API server.
- **Genkit**: Manages AI flows for language detection, tone analysis, and response generation.
- **JWT & bcrypt**: Secure, token-based authentication and password hashing.
- **Winston & Morgan**: Comprehensive logging for monitoring and debugging.
- **Helmet, CORS, Rate-Limiting**: A multi-layered security approach.

### Frontend (Client-Side)
- **Vanilla HTML5/CSS3/JS**: Built with modern, accessible web standards.
- **Service Worker**: Enables offline support and caches assets for faster load times.
- **Responsive Design**: A mobile-first approach ensures a seamless experience on any device.

## 📁 Updated Project Structure

```
CompanionApp/
├── public/                 # Frontend files (HTML, CSS, JS)
│   ├── index.html
│   ├── login.html
│   ├── ...
│   └── sw.js              # Service worker
├── server/                # Backend files
│   ├── server.js          # Main Express server
│   ├── gemini.js          # Google Gemini integration
│   ├── openai.js          # OpenAI GPT-4 integration
│   ├── anthropic.js       # Anthropic Claude integration
│   ├── package.json
│   ├── .env
│   └── logs/
├── .eslintrc.json
├── start.sh
└── README.md
```

## 🔮 Future Enhancements

### Phase 3: Advanced AI Integration (Completed)
- [x] OpenAI GPT-4 API integration
- [x] Google Gemini API integration
- [x] Anthropic Claude API integration
- [x] Advanced emotion and language classification models
- [x] Multi-language support expansion

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

## 🔄 Changelog

### v2.3.0
- 🌐 Implemented multi-language support with automatic language detection.
- 🗣️ AI now responds in the user's native language for a more inclusive experience.
- 🧠 Enhanced tone analysis to work accurately across different languages.

### v2.2.0
- 🤖 Added a smart AI provider fallback system (Gemini, OpenAI, Anthropic) for improved reliability.
- 😊 Implemented automatic tone detection when not provided by the user.

### v2.1.0
- ✨ Enhanced security with Helmet.js and improved rate limiting.
- 🚀 Added a service worker for offline support and asset caching.
- 📱 Improved responsive design and accessibility.

---

**Made with ❤️ for better communication, emotional well-being, and mindfulness.**
