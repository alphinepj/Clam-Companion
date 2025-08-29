class Community {
    constructor() {
        this.userEmail = null;
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.checkAuth();
        this.displayUserEmail();
        this.loadCommunityFeed();
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

    async loadCommunityFeed() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/community/feed`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const feed = await response.json();
                this.renderFeed(feed);
            } else {
                console.error('Failed to load community feed');
            }
        } catch (error) {
            console.error('Error loading community feed:', error);
        }
    }

    renderFeed(feed) {
        const feedContainer = document.getElementById('community-feed');
        feedContainer.innerHTML = ''; // Clear existing posts

        feed.forEach(post => {
            const postElement = this.createPostElement(post);
            feedContainer.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'community-post';

        const postHeader = document.createElement('div');
        postHeader.className = 'post-header';
        postHeader.innerHTML = `<strong>${post.author}</strong> shared a milestone`;
        postDiv.appendChild(postHeader);

        const postContent = document.createElement('div');
        postContent.className = 'post-content';
        postContent.textContent = post.content;
        postDiv.appendChild(postContent);

        const postFooter = document.createElement('div');
        postFooter.className = 'post-footer';
        postFooter.innerHTML = `<span class="post-likes">${post.likes} Likes</span> <span class="post-date">${new Date(post.date).toLocaleString()}</span>`;
        postDiv.appendChild(postFooter);

        return postDiv;
    }
}

document.addEventListener('DOMContentLoaded', () => new Community());
