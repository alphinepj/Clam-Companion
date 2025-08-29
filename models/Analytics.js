const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalTimeMeditated: {
        type: Number,
        default: 0
    },
    sessionsCount: {
        type: Number,
        default: 0
    },
    currentStreak: {
        type: Number,
        default: 0
    },
    longestStreak: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);
