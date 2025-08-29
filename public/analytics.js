class Analytics {
    constructor() {
        this.userProfile = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserProfile();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            document.getElementById('user-email').textContent = payload.email;
        } catch (e) {
            console.error('Error parsing token:', e);
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.userProfile = await response.json();
                this.renderCharts();
            } else {
                console.error('Failed to load profile');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    renderCharts() {
        this.renderGoalsChart();
        this.renderDurationChart();
    }

    renderGoalsChart() {
        const ctx = document.getElementById('goals-chart').getContext('2d');
        const goals = this.userProfile.conversationGoals || {};
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(goals),
                datasets: [{
                    data: Object.values(goals),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ]
                }]
            }
        });
    }

    renderDurationChart() {
        const ctx = document.getElementById('duration-chart').getContext('2d');
        const sessions = this.userProfile.meditationSessions || [];
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sessions.map(s => new Date(s.date).toLocaleDateString()),
                datasets: [{
                    label: 'Session Duration (minutes)',
                    data: sessions.map(s => s.duration),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false
                }]
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new Analytics());