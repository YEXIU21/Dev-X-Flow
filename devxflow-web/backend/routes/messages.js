const express = require('express');
const db = require('../database');
const auth = require('./auth');

const router = express.Router();

// Submit message (public - no auth required)
router.post('/submit', async (req, res) => {
    try {
        const { customer_name, customer_email, subject, message } = req.body;
        
        // Validation
        if (!customer_name || !customer_email || !subject || !message) {
            return res.status(400).json({ 
                error: 'All fields are required' 
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer_email)) {
            return res.status(400).json({ 
                error: 'Invalid email address' 
            });
        }
        
        // Create message using Mongoose model
        const Message = db.models.Message;
        const newMessage = await Message.create({
            customer_name,
            customer_email,
            subject,
            message
        });
        
        res.json({
            success: true,
            message: 'Message sent successfully! We will get back to you soon.',
            id: newMessage._id
        });
        
    } catch (error) {
        console.error('Message submission error:', error);
        res.status(500).json({ 
            error: 'Failed to send message' 
        });
    }
});

// Get all messages (admin only)
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        const status = req.query.status || 'all';
        const Message = db.models.Message;
        
        let query = {};
        if (status !== 'all') {
            query.status = status;
        }
        
        const messages = await Message.find(query)
            .sort({ created_at: -1 })
            .lean();
        
        res.json({
            success: true,
            count: messages.length,
            messages
        });
        
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to retrieve messages' });
    }
});

// Get single message (admin only)
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const Message = db.models.Message;
        
        const message = await Message.findById(id).lean();
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        // Mark as read if unread
        if (message.status === 'unread') {
            await Message.findByIdAndUpdate(id, { status: 'read' });
            message.status = 'read';
        }
        
        res.json({
            success: true,
            message: message
        });
        
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ error: 'Failed to retrieve message' });
    }
});

// Reply to message (admin only)
router.post('/:id/reply', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        const Message = db.models.Message;
        
        if (!reply) {
            return res.status(400).json({ error: 'Reply message is required' });
        }
        
        // Check if message exists
        const message = await Message.findById(id);
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        // Update with reply
        await Message.findByIdAndUpdate(id, {
            status: 'replied',
            admin_reply: reply,
            replied_at: new Date()
        });
        
        res.json({
            success: true,
            message: 'Reply sent successfully'
        });
        
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

// Get message stats (admin only)
router.get('/stats/overview', auth.verifyToken, async (req, res) => {
    try {
        const Message = db.models.Message;
        
        const total = await Message.countDocuments();
        const unread = await Message.countDocuments({ status: 'unread' });
        const read = await Message.countDocuments({ status: 'read' });
        const replied = await Message.countDocuments({ status: 'replied' });
        
        res.json({
            success: true,
            stats: { total, unread, read, replied }
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Delete message (admin only)
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const Message = db.models.Message;
        
        await Message.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Message deleted'
        });
        
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
