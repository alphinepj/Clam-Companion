const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    theme: {
        type: String,
        default: 'light'
    },
    notifications: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Settings', SettingsSchema);
