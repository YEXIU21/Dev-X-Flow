const express = require('express');
const { models } = require('../database');
const auth = require('./auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth.verifyToken);
router.use(auth.isAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // Get license stats using MongoDB aggregation
        const totalLicenses = await models.License.countDocuments();
        const activeLicenses = await models.License.countDocuments({ 
            status: 'active',
            $or: [
                { expires_at: null },
                { expires_at: { $gt: new Date() } }
            ]
        });
        const revokedLicenses = await models.License.countDocuments({ status: 'revoked' });
        const expiredLicenses = await models.License.countDocuments({
            status: 'active',
            expires_at: { $lt: new Date() }
        });
        const totalActivations = await models.Activation.countDocuments();

        // Get recent validation logs (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const recentValidations = await models.ValidationLog.aggregate([
            { $match: { validated_at: { $gt: yesterday } } },
            { $group: { _id: '$result', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            stats: {
                total_licenses: totalLicenses,
                active_licenses: activeLicenses,
                revoked_licenses: revokedLicenses,
                expired_licenses: expiredLicenses,
                total_activations: totalActivations,
                recent_validations: recentValidations.map(v => ({ result: v._id, count: v.count }))
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get validation logs with pagination
router.get('/logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const logs = await models.ValidationLog
            .find()
            .sort({ validated_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await models.ValidationLog.countDocuments();

        res.json({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// Search licenses
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        // If no query, return all licenses
        const searchQuery = q && q.trim() ? q.trim() : null;
        
        let licenses;
        if (searchQuery) {
            // Search using MongoDB regex
            licenses = await models.License.find({
                $or: [
                    { license_key: { $regex: searchQuery, $options: 'i' } },
                    { customer_email: { $regex: searchQuery, $options: 'i' } }
                ]
            })
            .sort({ created_at: -1 })
            .lean();
        } else {
            // Return all licenses when no search query
            licenses = await models.License.find()
                .sort({ created_at: -1 })
                .lean();
        }

        // Get activation counts for each license
        const licensesWithCounts = await Promise.all(licenses.map(async (license) => {
            const activationCount = await models.Activation.countDocuments({ license_id: license._id });
            return {
                ...license,
                current_activations: activationCount
            };
        }));

        res.json({
            success: true,
            licenses: licensesWithCounts
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Generate new license
router.post('/license/generate', async (req, res) => {
    try {
        const { customer_email, max_activations, expires_at } = req.body;
        
        // Generate a random secure license key (e.g., DEVX-XXXX-XXXX-XXXX)
        const crypto = require('crypto');
        const key = `DEVX-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const license = new models.License({
            license_key: key,
            customer_email,
            max_activations: max_activations || 3,
            expires_at: expires_at ? new Date(expires_at) : null,
            status: 'active'
        });

        await license.save();

        res.json({
            success: true,
            license: {
                id: license._id,
                license_key: license.license_key,
                customer_email: license.customer_email,
                max_activations: license.max_activations,
                status: license.status
            }
        });

    } catch (error) {
        console.error('Generate license error:', error);
        res.status(500).json({ error: 'Failed to generate license' });
    }
});

// Revoke/Delete license
router.delete('/license/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const license = await models.License.findById(id);
        
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        // Option 1: Hard delete
        await models.License.findByIdAndDelete(id);
        // Option 2: Soft delete / revoke (already in schema but let's do hard delete for cleanup)
        await models.Activation.deleteMany({ license_id: id });

        res.json({
            success: true,
            message: 'License and associated activations removed'
        });

    } catch (error) {
        console.error('Delete license error:', error);
        res.status(500).json({ error: 'Failed to delete license' });
    }
});

// Reset activations for a license
router.post('/license/:id/reset', async (req, res) => {
    try {
        const { id } = req.params;
        const license = await models.License.findById(id);
        
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        // Remove all activations for this license
        await models.Activation.deleteMany({ license_id: id });

        res.json({
            success: true,
            message: 'Activations reset successfully'
        });

    } catch (error) {
        console.error('Reset activations error:', error);
        res.status(500).json({ error: 'Failed to reset activations' });
    }
});

// Change admin password
router.post('/change-password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const adminId = req.user.adminId; // Updated from req.admin.adminId

        // Get current admin using Mongoose
        const admin = await models.Admin.findById(adminId);
        
        // Verify current password
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(current_password, admin.password_hash);
        
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newHash = await bcrypt.hash(new_password, 10);
        
        // Update password
        admin.password_hash = newHash;
        await admin.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get customers list for admin chat
router.get('/customers', async (req, res) => {
    try {
        // Get all customers with their basic info
        const customers = await models.Customer.find({}, '-password_hash')
            .sort({ created_at: -1 })
            .lean();

        res.json({
            success: true,
            customers: customers.map(c => ({
                _id: c._id,
                email: c.email,
                full_name: c.full_name,
                created_at: c.created_at
            }))
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to get customers' });
    }
});

// List all users (Admins and Customers)
router.get('/users', async (req, res) => {
    try {
        const admins = await models.Admin.find({}, '-password_hash').lean();
        const customers = await models.Customer.find({}, '-password_hash').lean();
        
        res.json({
            success: true,
            users: {
                admins: admins.map(a => ({ ...a, role: 'admin' })),
                customers: customers.map(c => ({ ...c, role: 'customer' }))
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Create a new user (Admin or Customer)
router.post('/users/create', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(password, 10);

        if (role === 'admin') {
            const admin = new models.Admin({ username, password_hash });
            await admin.save();
        } else {
            const customer = new models.Customer({ email, password_hash, full_name: username });
            await customer.save();
        }

        res.json({ success: true, message: `User created successfully as ${role}` });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

module.exports = router;
