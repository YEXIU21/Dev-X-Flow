const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devxflow-secret-key-change-in-production';

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username/email and password are required' 
            });
        }

        // Get admin from database - support both username and email
        const admin = await models.Admin.findOne({ 
            $or: [
                { username: username },
                { email: username }
            ]
        });

        if (!admin) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                adminId: admin._id, 
                username: admin.username,
                email: admin.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed' 
        });
    }
});

// Verify token middleware (used by other routes)
router.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.' 
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Generalize to req.user
        req.userId = decoded.adminId || decoded.customerId; // Support both admin and customer
        next();
    } catch (error) {
        return res.status(401).json({ 
            error: 'Invalid or expired token' 
        });
    }
};

// Admin role check middleware
router.isAdmin = (req, res, next) => {
    if (!req.user || !req.user.adminId) {
        return res.status(403).json({ 
            error: 'Access denied. Admin privileges required.' 
        });
    }
    next();
};

module.exports = router;
