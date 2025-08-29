const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');

// @route   POST api/chat
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
    const { message, goal, conversationId } = req.body;
    const userId = req.user.id;

    try {
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        } else {
            conversation = new Conversation({ userId, goal, messages: [] });
        }

        conversation.messages.push({ role: 'user', content: message });

        // ** AI response generation logic would go here **
        const aiResponse = `This is a placeholder AI response to your message: "${message}"`;

        conversation.messages.push({ role: 'ai', content: aiResponse });

        await conversation.save();

        res.json({
            response: aiResponse,
            conversationId: conversation.id
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/chat/:conversationId
// @desc    Get conversation history
// @access  Private
router.get('/:conversationId', auth, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.conversationId);

        if (!conversation || conversation.userId.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Conversation not found' });
        }

        res.json(conversation.messages);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
