const mongoose = require('mongoose');

const MeditationSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: { // e.g., 'guided', 'timed'
        type: String,
        required: true
    },
    duration: { // in minutes
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String
    }
});

module.exports = mongoose.model('MeditationSession', MeditationSessionSchema);
