const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { models } = require('../database');
const auth = require('./auth');

const router = express.Router();

// Generate a new license key (admin only)
router.post('/generate', auth.verifyToken, async (req, res) => {
    try {
        const { customer_email, expires_days = 365, max_activations = 3 } = req.body;

        // Generate unique license key (format: XXXX-XXXX-XXXX-XXXX)
        const licenseKey = uuidv4().toUpperCase().replace(/-/g, '').substring(0, 16);
        const formattedKey = `${licenseKey.substring(0, 4)}-${licenseKey.substring(4, 8)}-${licenseKey.substring(8, 12)}-${licenseKey.substring(12, 16)}`;

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expires_days));

        // Create license in MongoDB
        const license = new models.License({
            license_key: formattedKey,
            customer_email,
            max_activations,
            expires_at: expiresAt
        });
        
        await license.save();

        res.json({
            success: true,
            license: {
                id: license._id,
                license_key: formattedKey,
                customer_email,
                max_activations,
                expires_at: expiresAt.toISOString(),
                status: 'active'
            }
        });

    } catch (error) {
        console.error('Generate license error:', error);
        res.status(500).json({ 
            error: 'Failed to generate license' 
        });
    }
});

// Get all licenses (admin only)
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        // Get all licenses with activation count
        const licenses = await models.License.find().sort({ created_at: -1 }).lean();
        
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
            count: licensesWithCounts.length,
            licenses: licensesWithCounts
        });

    } catch (error) {
        console.error('Get licenses error:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve licenses' 
        });
    }
});

// Get license details (admin only)
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const license = await models.License.findById(id).lean();

        if (!license) {
            return res.status(404).json({ 
                error: 'License not found' 
            });
        }
        
        // Get activated devices
        const activations = await models.Activation.find({ license_id: id }).lean();
        license.activated_devices = activations.map(a => a.device_id).join(',');

        res.json({
            success: true,
            license
        });

    } catch (error) {
        console.error('Get license error:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve license' 
        });
    }
});

// Revoke a license (admin only)
router.post('/:id/revoke', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const license = await models.License.findByIdAndUpdate(id, {
            status: 'revoked',
            revoked_at: new Date()
        });

        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        res.json({
            success: true,
            message: 'License revoked successfully'
        });

    } catch (error) {
        console.error('Revoke license error:', error);
        res.status(500).json({ 
            error: 'Failed to revoke license' 
        });
    }
});

// Reactivate a revoked license (admin only)
router.post('/:id/reactivate', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const license = await models.License.findByIdAndUpdate(id, {
            status: 'active',
            revoked_at: null
        });

        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        res.json({
            success: true,
            message: 'License reactivated successfully'
        });

    } catch (error) {
        console.error('Reactivate license error:', error);
        res.status(500).json({ 
            error: 'Failed to reactivate license' 
        });
    }
});

module.exports = router;
