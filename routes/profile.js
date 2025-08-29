const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UserProfile = require('../models/UserProfile');

// @route   GET api/profile
// @desc    Get user profile
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id });

        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/profile
// @desc    Create or update user profile
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, bio, avatar } = req.body;
    const userId = req.user.id;

    const profileFields = { userId, name, bio, avatar };

    try {
        let profile = await UserProfile.findOne({ userId });

        if (profile) {
            // Update
            profile = await UserProfile.findOneAndUpdate({ userId }, { $set: profileFields }, { new: true });
            return res.json(profile);
        }

        // Create
        profile = new UserProfile(profileFields);
        await profile.save();
        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
