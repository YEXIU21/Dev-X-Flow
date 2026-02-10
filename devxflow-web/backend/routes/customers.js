const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devxflow-customer-secret-key';

// Customer registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        
        // Password strength
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        // Check if email already exists
        const existingUser = await db.get(
            'SELECT id FROM customers WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create customer
        const result = await db.run(
            `INSERT INTO customers (email, password_hash, name, created_at) 
             VALUES (?, ?, ?, datetime('now'))`,
            [email.toLowerCase(), passwordHash, name]
        );
        
        // Generate JWT
        const token = jwt.sign(
            { 
                customerId: result.id, 
                email: email.toLowerCase(),
                role: 'customer'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Registration successful',
            token,
            customer: {
                id: result.id,
                email: email.toLowerCase(),
                name
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Customer login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Find customer
        const customer = await db.get(
            'SELECT * FROM customers WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (!customer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, customer.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { 
                customerId: customer.id, 
                email: customer.email,
                role: 'customer'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            customer: {
                id: customer.id,
                email: customer.email,
                name: customer.name
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get customer profile
router.get('/profile', verifyCustomerToken, async (req, res) => {
    try {
        const customer = await db.get(
            `SELECT id, email, name, created_at,
                    datetime(last_login) as last_login
             FROM customers WHERE id = ?`,
            [req.customerId]
        );
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        // Get customer's licenses
        const licenses = await db.all(
            `SELECT license_key, status, created_at, expires_at,
                    (SELECT COUNT(*) FROM activations WHERE license_id = licenses.id) as activation_count
             FROM licenses 
             WHERE customer_email = ?
             ORDER BY created_at DESC`,
            [customer.email]
        );
        
        res.json({
            success: true,
            customer,
            licenses: licenses || []
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update customer profile
router.put('/profile', verifyCustomerToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        await db.run(
            'UPDATE customers SET name = ? WHERE id = ?',
            [name, req.customerId]
        );
        
        res.json({
            success: true,
            message: 'Profile updated'
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Change password
router.put('/password', verifyCustomerToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Get customer
        const customer = await db.get(
            'SELECT password_hash FROM customers WHERE id = ?',
            [req.customerId]
        );
        
        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, customer.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);
        
        await db.run(
            'UPDATE customers SET password_hash = ? WHERE id = ?',
            [newHash, req.customerId]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Password change failed' });
    }
});

// Customer JWT verification middleware
function verifyCustomerToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== 'customer') {
            return res.status(403).json({ error: 'Access denied. Customer role required.' });
        }
        
        req.customerId = decoded.customerId;
        req.customerEmail = decoded.email;
        next();
        
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = router;
