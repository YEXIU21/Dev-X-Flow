const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../database');

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
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if email already exists
        const existingUser = await models.Customer.findOne({ email: email.toLowerCase() });
        
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create customer
        const customer = await models.Customer.create({
            email: email.toLowerCase(),
            password_hash: passwordHash,
            name: name
        });
        
        // Generate JWT
        const token = jwt.sign(
            { 
                customerId: customer._id, 
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
                id: customer._id,
                email: customer.email,
                name: customer.name
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
        const customer = await models.Customer.findOne({ email: email.toLowerCase() });
        
        if (!customer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, customer.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        customer.last_login = new Date();
        await customer.save();
        
        // Generate JWT
        const token = jwt.sign(
            { 
                customerId: customer._id, 
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
                id: customer._id,
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
        const customer = await models.Customer.findById(req.customerId);
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        // Get customer's licenses
        const licenses = await models.License.find({ customer_email: customer.email })
            .sort({ created_at: -1 })
            .lean();
        
        // Get activation counts
        const licensesWithCounts = await Promise.all(licenses.map(async (license) => {
            const count = await models.Activation.countDocuments({ license_id: license._id });
            return { ...license, activation_count: count };
        }));
        
        res.json({
            success: true,
            customer: {
                id: customer._id,
                email: customer.email,
                name: customer.name,
                created_at: customer.created_at,
                last_login: customer.last_login
            },
            licenses: licensesWithCounts
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
        
        await models.Customer.findByIdAndUpdate(req.customerId, { name });
        
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
        const customer = await models.Customer.findById(req.customerId);
        
        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, customer.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);
        
        customer.password_hash = newHash;
        await customer.save();
        
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
