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
        
        // Insert message
        const result = await db.run(
            `INSERT INTO messages (customer_name, customer_email, subject, message) 
             VALUES (?, ?, ?, ?)`,
            [customer_name, customer_email, subject, message]
        );
        
        res.json({
            success: true,
            message: 'Message sent successfully! We will get back to you soon.',
            id: result.id
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
        
        let query = `
            SELECT m.*, 
                   datetime(m.created_at, 'localtime') as formatted_date
            FROM messages m
        `;
        
        if (status !== 'all') {
            query += ` WHERE m.status = ?`;
        }
        
        query += ` ORDER BY 
            CASE m.status 
                WHEN 'unread' THEN 1 
                WHEN 'replied' THEN 2 
                ELSE 3 
            END,
            m.created_at DESC
        `;
        
        const messages = await db.all(query, status !== 'all' ? [status] : []);
        
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
        
        const message = await db.get(
            `SELECT m.*, 
                    datetime(m.created_at, 'localtime') as formatted_date,
                    datetime(m.replied_at, 'localtime') as formatted_replied_date
             FROM messages m
             WHERE m.id = ?`,
            [id]
        );
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        // Mark as read if unread
        if (message.status === 'unread') {
            await db.run(
                'UPDATE messages SET status = ? WHERE id = ?',
                ['read', id]
            );
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
        
        if (!reply) {
            return res.status(400).json({ error: 'Reply message is required' });
        }
        
        // Check if message exists
        const message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        // Update with reply
        await db.run(
            `UPDATE messages 
             SET status = ?, admin_reply = ?, replied_at = datetime('now') 
             WHERE id = ?`,
            ['replied', reply, id]
        );
        
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
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
                SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
            FROM messages
        `);
        
        res.json({
            success: true,
            stats
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
        
        await db.run('DELETE FROM messages WHERE id = ?', [id]);
        
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
