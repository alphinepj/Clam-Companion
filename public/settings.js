class Settings {
    constructor() {
        this.userEmail = null;
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.checkAuth();
        this.displayUserEmail();
        this.loadSettings();
        this.setupEventListeners();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    displayUserEmail() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                this.userEmail = payload.email;
                document.getElementById('user-email').textContent = this.userEmail;
            } catch (e) {
                console.error('Error parsing token:', e);
                this.logout();
            }
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    async loadSettings() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const settings = await response.json();
                document.getElementById('notifications').value = settings.notifications;
                document.getElementById('theme').value = settings.theme;
                // Apply the theme
                document.body.className = `${settings.theme}-theme`;

            } else {
                console.error('Failed to load settings');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        const notifications = document.getElementById('notifications').value;
        const theme = document.getElementById('theme').value;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notifications, theme })
            });

            if (response.ok) {
                // Apply the theme immediately
                 document.body.className = `${theme}-theme`;
                alert('Settings saved successfully!');
            } else {
                console.error('Failed to save settings');
                 alert('Failed to save settings.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('An error occurred while saving settings.');
        }
    }

    setupEventListeners() {
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
    }
}

document.addEventListener('DOMContentLoaded', () => new Settings());
