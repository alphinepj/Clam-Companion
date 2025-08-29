const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MeditationSession = require('../models/MeditationSession');

// @route   GET api/meditation
// @desc    Get all meditation sessions for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const sessions = await MeditationSession.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(sessions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/meditation
// @desc    Log a new meditation session
// @access  Private
router.post('/', auth, async (req, res) => {
    const { type, duration, notes } = req.body;
    const userId = req.user.id;

    try {
        const newSession = new MeditationSession({
            userId,
            type,
            duration,
            notes
        });

        const session = await newSession.save();
        res.json(session);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
