const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String
    },
    bio: {
        type: String
    },
    avatar: {
        type: String
    }
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
