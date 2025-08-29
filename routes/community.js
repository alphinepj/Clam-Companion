const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CommunityPost = require('../models/CommunityPost');
const UserProfile = require('../models/UserProfile');

// @route   GET api/community
// @desc    Get all community posts
// @access  Public
router.get('/', async (req, res) => {
    try {
        const posts = await CommunityPost.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/community
// @desc    Create a new post
// @access  Private
router.post('/', auth, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
        const profile = await UserProfile.findOne({ userId });
        const author = profile ? profile.name : 'Anonymous';

        const newPost = new CommunityPost({
            userId,
            author,
            title,
            content
        });

        const post = await newPost.save();
        res.json(post);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/community/comment/:id
// @desc    Comment on a post
// @access  Private
router.post('/comment/:id', auth, async (req, res) => {
    const { text } = req.body;
    const userId = req.user.id;

    try {
        const profile = await UserProfile.findOne({ userId });
        const author = profile ? profile.name : 'Anonymous';

        const post = await CommunityPost.findById(req.params.id);

        const newComment = {
            userId,
            author,
            text
        };

        post.comments.unshift(newComment);

        await post.save();

        res.json(post.comments);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
