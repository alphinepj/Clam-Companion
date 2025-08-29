const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Settings = require('../models/Settings');

// @route   GET api/settings
// @desc    Get user settings
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let settings = await Settings.findOne({ userId: req.user.id });

        if (!settings) {
            settings = new Settings({ userId: req.user.id });
            await settings.save();
        }

        res.json(settings);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/settings
// @desc    Update user settings
// @access  Private
router.post('/', auth, async (req, res) => {
    const { theme, notifications } = req.body;
    const userId = req.user.id;

    const settingsFields = { userId, theme, notifications };

    try {
        let settings = await Settings.findOneAndUpdate(
            { userId }, 
            { $set: settingsFields }, 
            { new: true, upsert: true }
        );

        res.json(settings);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
