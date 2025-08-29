const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const MeditationSession = require('../models/MeditationSession');

// @route   GET api/analytics
// @desc    Get user analytics
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let analytics = await Analytics.findOne({ userId: req.user.id });

        if (!analytics) {
            analytics = await calculateAnalytics(req.user.id);
        }

        res.json(analytics);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// This function can be expanded to be more sophisticated
const calculateAnalytics = async (userId) => {
    const sessions = await MeditationSession.find({ userId }).sort({ date: 1 });
    let totalTimeMeditated = 0;
    let sessionsCount = sessions.length;
    let currentStreak = 0;
    let longestStreak = 0;

    if (sessionsCount > 0) {
        totalTimeMeditated = sessions.reduce((acc, session) => acc + session.duration, 0);

        let streak = 0;
        let lastDate = null;

        for (const session of sessions) {
            if (lastDate) {
                const diff = (session.date.setHours(0,0,0,0) - lastDate.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    streak++;
                } else if (diff > 1) {
                    if (streak > longestStreak) {
                        longestStreak = streak;
                    }
                    streak = 1;
                }
            } else {
                streak = 1;
            }
            lastDate = session.date;
        }

        if (streak > longestStreak) {
            longestStreak = streak;
        }
        currentStreak = streak; // This is a simplification
    }

    let analytics = await Analytics.findOneAndUpdate(
        { userId },
        { $set: { totalTimeMeditated, sessionsCount, currentStreak, longestStreak } },
        { new: true, upsert: true }
    );

    return analytics;
}

module.exports = router;
