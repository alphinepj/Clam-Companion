class AdvancedAnalytics {
    constructor() {
        this.userEmail = null;
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.checkAuth();
        this.displayUserEmail();
        this.loadAnalyticsData();
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

    async loadAnalyticsData() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/analytics/advanced`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderCharts(data);
            } else {
                console.error('Failed to load advanced analytics');
            }
        } catch (error) {
            console.error('Error loading advanced analytics:', error);
        }
    }

    renderCharts(data) {
        this.renderSentimentChart(data.sentiment_trend);
        this.renderActivityChart(data.hourly_activity);
        this.renderWordCloud(data.word_cloud);
    }

    renderSentimentChart(sentimentData) {
        const ctx = document.getElementById('sentiment-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Sentiment Score',
                    data: sentimentData, // Expects an array of {x: date, y: score}
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    },
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    renderActivityChart(activityData) {
        const ctx = document.getElementById('activity-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: activityData.labels, // Expects an array of hours
                datasets: [{
                    label: 'Messages per Hour',
                    data: activityData.data,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)'
                }]
            }
        });
    }

    renderWordCloud(wordData) {
        // Word cloud implementation will go here
        // This might require a different library or a custom implementation
        const canvas = document.getElementById('word-cloud-chart');
        const ctx = canvas.getContext('2d');
        // Placeholder implementation
        ctx.font = '20px Arial';
        ctx.fillText('Word Cloud (to be implemented)', 10, 50);

    }
}

document.addEventListener('DOMContentLoaded', () => new AdvancedAnalytics());
