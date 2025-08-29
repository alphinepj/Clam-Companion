const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/calm-companion';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// API Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');
const meditationRoutes = require('./routes/meditation');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const communityRoutes = require('./routes/community');

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/community', communityRoutes);

// Socket.IO for real-time features
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let groupSessions = [];

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Handle user leaving a session
    });

    // Group meditation events
    socket.on('get_sessions', () => {
        socket.emit('sessions', groupSessions);
    });

    socket.on('create_session', (data) => {
        const newSession = { id: Date.now().toString(), name: data.name, participants: [], host: socket.id };
        groupSessions.push(newSession);
        io.emit('sessions', groupSessions);
        socket.join(newSession.id);
        socket.emit('session_joined', newSession);
    });

    socket.on('join_session', (data) => {
        const session = groupSessions.find(s => s.id === data.sessionId);
        if (session) {
            session.participants.push({ id: socket.id, email: 'test@example.com' /* Get user email */ });
            socket.join(session.id);
            io.to(session.id).emit('session_updated', session);
            socket.emit('session_joined', session);
        }
    });

    socket.on('leave_session', (data) => {
        const session = groupSessions.find(s => s.id === data.sessionId);
        if (session) {
            session.participants = session.participants.filter(p => p.id !== socket.id);
            socket.leave(session.id);
            io.to(session.id).emit('session_updated', session);
            socket.emit('session_left');
        }
    });
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
