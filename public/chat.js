// Chat.js - Enhanced chat functionality for Calm Companion v2.1.0


class CalmCompanionChat {
    constructor() {
        this.currentGoal = null;
        this.conversationHistory = [];
        this.currentConversationId = null;
        this.isLoading = false;
        this.userProfile = null;
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.displayUserEmail();
        this.loadUserProfile();
        this.showWelcomeSection();
        this.setupServiceWorker();
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            if (payload.exp < currentTime) {
                this.logout();
                return;
            }
        } catch (e) {
            console.error('Error parsing token:', e);
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userProfile');
        window.location.href = 'login.html';
    }

    displayUserEmail() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userEmailElement = document.getElementById('user-email');
                if (userEmailElement) {
                    userEmailElement.textContent = payload.email;
                }
            } catch (e) {
                console.error('Error parsing token:', e);
                this.logout();
            }
        }
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            const response = await this.makeRequest(`${this.apiBaseUrl}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.userProfile = await response.json();
                this.updateProfileDisplay();
                this.updateQuickStats();
                // Cache profile data
                localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Try to load cached profile
            const cachedProfile = localStorage.getItem('userProfile');
            if (cachedProfile) {
                this.userProfile = JSON.parse(cachedProfile);
                this.updateProfileDisplay();
                this.updateQuickStats();
            }
        }
    }

    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    updateProfileDisplay() {
        if (this.userProfile) {
            const profileLink = document.getElementById('profile-link');
            if (profileLink) {
                profileLink.textContent = `${this.userProfile.email} (${this.userProfile.conversationCount} chats)`;
            }
        }
    }

    updateQuickStats() {
        if (this.userProfile) {
            const conversationCountElement = document.getElementById('conversation-count');
            const messageCountElement = document.getElementById('message-count');
            const daysActiveElement = document.getElementById('days-active');

            if (conversationCountElement) {
                conversationCountElement.textContent = this.userProfile.conversationCount;
            }
            if (messageCountElement) {
                messageCountElement.textContent = this.userProfile.totalMessages;
            }
            if (daysActiveElement) {
                daysActiveElement.textContent = this.userProfile.daysActive || 1;
            }
        }
    }

    setupEventListeners() {
        // Goal selection with improved accessibility
        document.querySelectorAll('.goal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectGoal(e.currentTarget.dataset.goal);
            });
            
            // Add keyboard support
            btn.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectGoal(e.currentTarget.dataset.goal);
                }
            });
        });

        // Message input with improved UX
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('input', (e) => {
                this.updateCharCount(e.target.value.length);
                this.autoResizeTextarea(e.target);
            });

            // Add paste event for better UX
            messageInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.updateCharCount(e.target.value.length);
                    this.autoResizeTextarea(e.target);
                }, 0);
            });
        }

        // Send button
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        // Clear conversation
        const clearButton = document.getElementById('clear-conversation');
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearConversation();
            });
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.sendMessage();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.clearConversation();
                        break;
                }
            }
        });

        // Add visibility change listener for better UX
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadUserProfile();
            }
        });
    }

    selectGoal(goal) {
        this.currentGoal = goal;
        this.currentConversationId = null;
        this.conversationHistory = [];
        
        // Update UI
        document.querySelectorAll('.goal-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-goal="${goal}"]`).classList.add('active');
        
        // Show goal-specific welcome message
        this.showGoalWelcome(goal);
        
        // Clear messages area
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.innerHTML = '';
        }
        
        // Focus on input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.focus();
        }
    }

    showGoalWelcome(goal) {
        const welcomeMessages = {
            'polite-greetings': "Let's practice friendly conversation starters! I'll help you learn polite ways to greet people in English.",
            'kind-disagreement': "Learning to disagree respectfully is an important skill. I'll help you practice kind ways to express different opinions.",
            'respectful-questions': "Let's practice asking questions politely in Japanese! I'll help you master respectful language patterns.",
            'emotional-support': "I'm here to provide emotional support and understanding. Share what's on your mind, and I'll listen with care.",
            'stress-relief': "Let's work on stress relief techniques together. I'll help you learn calming strategies and mindfulness practices."
        };

        const message = welcomeMessages[goal] || "I'm here to help you with your conversation goals!";
        this.addAIMessage(message);
    }

    showWelcomeSection() {
        const welcomeSection = document.getElementById('welcome-section');
        if (welcomeSection) {
            welcomeSection.style.display = 'block';
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;
        
        if (!this.currentGoal) {
            this.showError('Please select a conversation goal first.');
            return;
        }
        
        // Add user message
        this.addUserMessage(message);
        input.value = '';
        this.updateCharCount(0);
        this.autoResizeTextarea(input);
        
        // Show loading
        this.setLoading(true);
        
        try {
            // Detect emotional tone
            const tone = this.detectEmotionalTone(message);
            this.updateToneIndicator(tone.type, tone.description);
            
            // Get AI response from server with retry logic
            const response = await this.getAIResponseWithRetry(message, tone);
            this.addAIMessage(response.response);
            
            // Update conversation ID
            this.currentConversationId = response.conversationId;
            
            // Refresh user profile to update stats
            this.loadUserProfile();
            
            // Reset retry attempts on success
            this.retryAttempts = 0;
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.showError('I\'m sorry, I\'m having trouble responding right now. Please try again in a moment.');
        } finally {
            this.setLoading(false);
        }
    }

    async getAIResponseWithRetry(message, tone) {
        while (this.retryAttempts < this.maxRetries) {
            try {
                return await this.getAIResponseFromServer(message, tone);
            } catch (error) {
                this.retryAttempts++;
                if (this.retryAttempts >= this.maxRetries) {
                    throw error;
                }
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryAttempts));
            }
        }
    }

    async getAIResponseFromServer(message, tone) {
        const token = localStorage.getItem('token');
        const response = await this.makeRequest(`${this.apiBaseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message,
                goal: this.currentGoal,
                tone: tone.type,
                conversationId: this.currentConversationId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401 || response.status === 403) {
                this.logout();
                throw new Error('Authentication failed');
            }
            throw new Error(error.error || 'Failed to get response');
        }

        return await response.json();
    }

    addUserMessage(text) {
        const messageDiv = this.createMessageElement(text, 'user');
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.appendChild(messageDiv);
            this.scrollToBottom();
        }
        this.conversationHistory.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
    }

    addAIMessage(text) {
        const messageDiv = this.createMessageElement(text, 'ai');
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.appendChild(messageDiv);
            this.scrollToBottom();
        }
        this.conversationHistory.push({ role: 'assistant', content: text, timestamp: new Date().toISOString() });
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }

    hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    createMessageElement(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const avatar = type === 'ai' ? '🌿' : '👤';
        const name = type === 'ai' ? 'Calm Companion' : 'You';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-avatar">${avatar}</span>
                <span class="message-name">${name}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;
        
        return messageDiv;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const sendButton = document.getElementById('send-button');
        const messageInput = document.getElementById('message-input');
        
        if (sendButton) {
            sendButton.disabled = loading;
            sendButton.innerHTML = loading ? '⏳' : '📤';
        }
        
        if (messageInput) {
            messageInput.disabled = loading;
        }
        
        // Show/hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
    }

    updateToneIndicator(tone, description) {
        const toneIndicator = document.getElementById('tone-indicator');
        if (toneIndicator) {
            const emoji = this.getToneEmoji(tone);
            toneIndicator.innerHTML = `${emoji} ${description}`;
            toneIndicator.className = `tone-indicator ${tone}`;
            toneIndicator.style.display = 'block';
            
            // Hide after 3 seconds
            setTimeout(() => {
                toneIndicator.style.display = 'none';
            }, 3000);
        }
    }

    getToneEmoji(tone) {
        const emojis = {
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'anxious': '😰',
            'excited': '🤩',
            'neutral': '😐'
        };
        return emojis[tone] || '😐';
    }

    detectEmotionalTone(text) {
        const lowerText = text.toLowerCase();
        
        // Enhanced tone detection with more keywords
        const tonePatterns = {
            happy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing', 'love', '❤️', '😊', '😄', '🎉'],
            sad: ['sad', 'depressed', 'lonely', 'miss', 'cry', 'tears', '😢', '😭', '💔'],
            angry: ['angry', 'mad', 'furious', 'hate', 'annoyed', 'frustrated', '😠', '😡', '💢'],
            anxious: ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'stress', '😰', '😨', '😱'],
            excited: ['excited', 'thrilled', 'ecstatic', 'amazing', 'incredible', '🤩', '✨', '🔥']
        };
        
        for (const [tone, patterns] of Object.entries(tonePatterns)) {
            if (patterns.some(pattern => lowerText.includes(pattern))) {
                return {
                    type: tone,
                    description: this.getToneDescription(tone)
                };
            }
        }
        
        return {
            type: 'neutral',
            description: 'Neutral tone detected'
        };
    }

    getToneDescription(tone) {
        const descriptions = {
            happy: 'Happy and positive',
            sad: 'Feeling down',
            angry: 'Frustrated or upset',
            anxious: 'Worried or nervous',
            excited: 'Very excited!',
            neutral: 'Calm and neutral'
        };
        return descriptions[tone] || 'Neutral tone';
    }

    updateCharCount(count) {
        const charCount = document.getElementById('char-count');
        if (charCount) {
            charCount.textContent = `${count}/500`;
            charCount.className = count > 450 ? 'char-count warning' : 'char-count';
        }
    }

    autoResizeTextarea(textarea) {
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    }

    clearConversation() {
        if (confirm('Are you sure you want to clear this conversation?')) {
            this.conversationHistory = [];
            this.currentConversationId = null;
            
            const messagesArea = document.getElementById('messages-area');
            if (messagesArea) {
                messagesArea.innerHTML = '';
            }
            
            // Show goal welcome message again
            if (this.currentGoal) {
                this.showGoalWelcome(this.currentGoal);
            }
        }
    }
}

// Initialize the chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CalmCompanionChat();
});

// Add performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page loaded in ${loadTime}ms`);
    });
}
