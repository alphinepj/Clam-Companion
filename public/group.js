class GroupMeditation {
    constructor() {
        this.socket = null;
        this.userEmail = null;
        this.currentSession = null;
        this.isHost = false;

        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.connectSocket();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.userEmail = payload.email;
            document.getElementById('user-email').textContent = this.userEmail;
        } catch (e) {
            console.error('Error parsing token:', e);
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    setupEventListeners() {
        document.getElementById('create-session-btn').addEventListener('click', () => this.createSession());
        document.getElementById('leave-session-btn').addEventListener('click', () => this.leaveSession());
    }

    connectSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('get_sessions');
        });

        this.socket.on('sessions', (sessions) => {
            this.renderSessionList(sessions);
        });

        this.socket.on('session_joined', (session) => {
            this.currentSession = session;
            this.showMeditationSession();
            this.updateParticipants(session.participants);
        });

        this.socket.on('session_updated', (session) => {
            if (this.currentSession && this.currentSession.id === session.id) {
                this.updateParticipants(session.participants);
            }
        });

        this.socket.on('session_left', () => {
            this.currentSession = null;
            this.showSessionSelection();
        });

        this.socket.on('timer_update', (time) => {
            this.updateTimerDisplay(time);
        });
    }

    createSession() {
        const sessionName = document.getElementById('session-name').value.trim();
        if (sessionName) {
            this.socket.emit('create_session', { name: sessionName });
            document.getElementById('session-name').value = '';
        }
    }

    joinSession(sessionId) {
        this.socket.emit('join_session', { sessionId });
    }

    leaveSession() {
        if (this.currentSession) {
            this.socket.emit('leave_session', { sessionId: this.currentSession.id });
        }
    }

    renderSessionList(sessions) {
        const sessionList = document.getElementById('session-list');
        sessionList.innerHTML = '';
        for (const session of sessions) {
            const li = document.createElement('li');
            li.textContent = `${session.name} (${session.participants.length} participants)`;
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.addEventListener('click', () => this.joinSession(session.id));
            li.appendChild(joinButton);
            sessionList.appendChild(li);
        }
    }

    showMeditationSession() {
        document.querySelector('.session-selection').style.display = 'none';
        document.querySelector('.meditation-session').style.display = 'block';
        document.getElementById('current-session-name').textContent = this.currentSession.name;
    }

    showSessionSelection() {
        document.querySelector('.session-selection').style.display = 'block';
        document.querySelector('.meditation-session').style.display = 'none';
    }

    updateParticipants(participants) {
        const participantsList = document.getElementById('participants');
        participantsList.innerHTML = '';
        for (const participant of participants) {
            const li = document.createElement('li');
            li.textContent = participant.email;
            participantsList.appendChild(li);
        }
    }

    updateTimerDisplay(time) {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        document.getElementById('timer-display').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => new GroupMeditation());