// Chat.js - Enhanced chat functionality for Calm Companion v2.5.0

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
        this.isRecording = false;
        this.speechRecognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.voiceEnabled = false;
        this.voices = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.displayUserEmail();
        this.loadUserProfile();
        this.showWelcomeSection();
        this.setupServiceWorker();
        this.setupSpeechRecognition();
        this.loadVoices();
        this.loadGoals();
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
                localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
            } else {
                this.loadCachedProfile();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.loadCachedProfile();
        }
    }

    loadCachedProfile() {
        const cachedProfile = localStorage.getItem('userProfile');
        if (cachedProfile) {
            this.userProfile = JSON.parse(cachedProfile);
            this.updateProfileDisplay();
            this.updateQuickStats();
        }
    }

    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        // This function is kept for legacy purposes, can be removed if not needed.
    }

    updateQuickStats() {
        if (this.userProfile) {
            document.getElementById('conversation-count').textContent = this.userProfile.conversationCount;
            document.getElementById('message-count').textContent = this.userProfile.totalMessages;
            document.getElementById('days-active').textContent = this.userProfile.daysActive || 1;
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.goal-btn').forEach(btn => {
            if (btn.id !== 'create-goal-btn') {
                btn.addEventListener('click', (e) => this.selectGoal(e.currentTarget.dataset.goal));
            }
        });

        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            messageInput.addEventListener('input', (e) => this.updateCharCount(e.target.value.length));
        }

        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('voice-btn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('voice-toggle').addEventListener('change', (e) => this.toggleVoiceOutput(e.target.checked));
        
        // Custom goal modal listeners
        document.getElementById('create-goal-btn').addEventListener('click', () => this.showCustomGoalModal());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.hideCustomGoalModal());
        document.getElementById('save-goal-btn').addEventListener('click', () => this.saveCustomGoal());
    }

    selectGoal(goal) {
        this.currentGoal = goal;
        this.currentConversationId = null;
        this.conversationHistory = [];

        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';

        const goalButton = document.querySelector(`[data-goal="${goal}"]`);
        if (goalButton) {
            document.getElementById('current-goal-icon').textContent = goalButton.querySelector('.goal-icon').textContent;
            document.getElementById('current-goal-text').textContent = goalButton.querySelector('h4').textContent;
        } else {
            // Handle custom goal
            document.getElementById('current-goal-icon').textContent = '✨';
            document.getElementById('current-goal-text').textContent = goal;
        }
        
        const messagesArea = document.getElementById('messages-area');
        messagesArea.innerHTML = '';
        this.showGoalWelcome(goal);
        document.getElementById('message-input').focus();
    }

    showGoalWelcome(goal) {
        const welcomeMessages = {
            'polite-greetings': "Let's practice friendly conversation starters! I'll help you learn polite ways to greet people in English.",
            'kind-disagreement': "Learning to disagree respectfully is an important skill. I'll help you practice kind ways to express different opinions.",
            'respectful-questions': "Let's practice asking questions politely in Japanese! I'll help you master respectful language patterns.",
            'emotional-support': "I'm here to provide emotional support and understanding. Share what's on your mind, and I'll listen with care.",
            'stress-relief': "Let's work on stress relief techniques together. I'll help you learn calming strategies and mindfulness practices."
        };
        const message = welcomeMessages[goal] || `I'm here to help you with your goal: "${goal}". Let's begin.`;
        this.addAIMessage(message);
    }

    showWelcomeSection() {
        document.getElementById('welcome-section').style.display = 'block';
        document.getElementById('chat-container').style.display = 'none';
        this.loadGoals(); // Reload goals when showing the welcome section
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;
        if (!this.currentGoal) {
            this.showError('Please select a conversation goal first.');
            return;
        }
        
        this.addUserMessage(message);
        input.value = '';
        this.updateCharCount(0);
        
        this.setLoading(true);
        
        try {
            const response = await this.getAIResponseWithRetry(message);
            this.addAIMessage(response.response);
            this.currentConversationId = response.conversationId;
            this.loadUserProfile();
            this.retryAttempts = 0;
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.showError('I\'m sorry, I\'m having trouble responding right now. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async getAIResponseWithRetry(message) {
        while (this.retryAttempts < this.maxRetries) {
            try {
                return await this.getAIResponseFromServer(message);
            } catch (error) {
                this.retryAttempts++;
                if (this.retryAttempts >= this.maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryAttempts));
            }
        }
    }

    async getAIResponseFromServer(message) {
        const token = localStorage.getItem('token');
        const response = await this.makeRequest(`${this.apiBaseUrl}/chat`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message, goal: this.currentGoal, conversationId: this.currentConversationId })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401 || response.status === 403) this.logout();
            throw new Error(error.error || 'Failed to get response');
        }
        return response.json();
    }

    addUserMessage(text) {
        this.addMessage(text, 'user');
    }

    addAIMessage(text) {
        this.addMessage(text, 'ai');
        if (this.voiceEnabled) {
            this.speak(text);
        }
    }

    addMessage(text, type) {
        const messageDiv = this.createMessageElement(text, type);
        const messagesArea = document.getElementById('messages-area');
        messagesArea.appendChild(messageDiv);
        this.scrollToBottom();
        this.conversationHistory.push({ role: type, content: text, timestamp: new Date().toISOString() });
    }

    createMessageElement(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const avatar = type === 'ai' ? '🌿' : '👤';
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content"><p>${this.escapeHtml(text)}</p></div>
            <div class="message-time">${time}</div>
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
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        document.getElementById('send-btn').disabled = loading;
        document.getElementById('voice-btn').disabled = loading;
        document.getElementById('message-input').disabled = loading;
        document.getElementById('loading-overlay').style.display = loading ? 'flex' : 'none';
    }

    showError(message) {
        const errorText = document.getElementById('error-text');
        errorText.textContent = message;
        document.getElementById('error-message').style.display = 'block';
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        document.getElementById('error-message').style.display = 'none';
    }

    updateCharCount(count) {
        const charCount = document.getElementById('char-count');
        charCount.textContent = `${count}/500`;
        charCount.classList.toggle('warning', count > 450);
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = false;
            this.speechRecognition.lang = 'en-US';

            this.speechRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('message-input').value = transcript;
                this.stopRecording();
                this.sendMessage();
            };

            this.speechRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showError('Sorry, I couldn\'t understand that. Please try again.');
                this.stopRecording();
            };

            this.speechRecognition.onend = () => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            };
        } else {
            document.getElementById('voice-btn').style.display = 'none';
            console.warn('Speech Recognition API not supported in this browser.');
        }
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        if (this.speechRecognition) {
            this.isRecording = true;
            this.speechRecognition.start();
            document.getElementById('recording-indicator').style.display = 'flex';
            document.getElementById('voice-btn').classList.add('recording');
        }
    }

    stopRecording() {
        if (this.speechRecognition && this.isRecording) {
            this.isRecording = false;
            this.speechRecognition.stop();
            document.getElementById('recording-indicator').style.display = 'none';
            document.getElementById('voice-btn').classList.remove('recording');
        }
    }

    toggleVoiceOutput(enabled) {
        this.voiceEnabled = enabled;
        if (!enabled) {
            this.speechSynthesis.cancel();
        }
    }

    loadVoices() {
        if (this.speechSynthesis.onvoiceschanged !== undefined) {
            this.speechSynthesis.onvoiceschanged = () => {
                this.voices = this.speechSynthesis.getVoices();
            };
        }
        this.voices = this.speechSynthesis.getVoices();
    }

    speak(text) {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Enhanced voice selection for a calmer experience
        const preferredVoices = [
            { name: 'Google US English', gender: 'female' },
            { name: 'Microsoft Zira Desktop - English (United States)', gender: 'female' },
            { name: 'Samantha', gender: 'female' }, // Common on Apple devices
        ];

        let selectedVoice = null;

        // Try to find a preferred voice
        for (const preferred of preferredVoices) {
            selectedVoice = this.voices.find(voice => voice.name === preferred.name && (!preferred.gender || voice.gender === preferred.gender));
            if (selectedVoice) break;
        }

        // Fallback to other local female voices
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice => voice.lang.startsWith('en') && voice.gender === 'female' && voice.localService);
        }

        // Final fallback to any local voice or the first available voice
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice => voice.localService) || this.voices[0];
        }

        utterance.voice = selectedVoice;
        utterance.pitch = 1.0; // Natural pitch
        utterance.rate = 0.9; // Slightly slower rate for a calming effect

        this.speechSynthesis.speak(utterance);
    }

    // Custom Goal Methods
    showCustomGoalModal() {
        document.getElementById('custom-goal-modal').style.display = 'block';
    }

    hideCustomGoalModal() {
        document.getElementById('custom-goal-modal').style.display = 'none';
    }

    saveCustomGoal() {
        const input = document.getElementById('custom-goal-input');
        const goalText = input.value.trim();
        if (goalText) {
            let customGoals = JSON.parse(localStorage.getItem('customGoals') || '[]');
            if (!customGoals.includes(goalText)) {
                customGoals.push(goalText);
                localStorage.setItem('customGoals', JSON.stringify(customGoals));
                this.addGoalButton(goalText, true);
            }
            this.selectGoal(goalText);
            this.hideCustomGoalModal();
            input.value = '';
        }
    }

    loadGoals() {
        const goalOptions = document.getElementById('goal-options');
        // Clear existing custom goals
        goalOptions.querySelectorAll('.custom-goal').forEach(btn => btn.remove());

        const customGoals = JSON.parse(localStorage.getItem('customGoals') || '[]');
        customGoals.forEach(goal => {
            this.addGoalButton(goal, true);
        });
    }

    addGoalButton(goal, isCustom) {
        const goalOptions = document.getElementById('goal-options');
        const button = this.createGoalButton(goal, isCustom);
        // Insert custom goals before the 'Create Your Own' button
        goalOptions.insertBefore(button, document.getElementById('create-goal-btn'));
    }

    createGoalButton(goal, isCustom) {
        const button = document.createElement('button');
        button.className = 'goal-btn';
        if (isCustom) {
            button.classList.add('custom-goal');
        }
        button.dataset.goal = goal;
        button.innerHTML = `
            <span class="goal-icon">✨</span>
            <div class="goal-content">
                <h4>${this.escapeHtml(goal)}</h4>
                <p>Custom goal</p>
            </div>
        `;
        button.addEventListener('click', () => this.selectGoal(goal));
        return button;
    }
}

document.addEventListener('DOMContentLoaded', () => new CalmCompanionChat());
