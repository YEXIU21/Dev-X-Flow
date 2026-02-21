const express = require('express');
const crypto = require('crypto');
const { models } = require('../database');

const router = express.Router();

// API key for desktop app (simple authentication)
const DESKTOP_API_KEY = process.env.DESKTOP_API_KEY || 'devxflow-desktop-key';

// Middleware to verify desktop app API key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== DESKTOP_API_KEY) {
        return res.status(401).json({
            valid: false,
            error: 'Invalid API key'
        });
    }
    
    next();
};

// Generate device ID from hardware info (authoritative)
function generateDeviceId(req, hardware_info) {
    if (hardware_info) {
        return crypto.createHash('sha256').update(hardware_info).digest('hex').substring(0, 32);
    }
    // Fallback to IP + UA if no hardware info provided (less secure)
    const data = req.ip + req.headers['user-agent'];
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Validate license (called by desktop app)
router.post('/', verifyApiKey, async (req, res) => {
    try {
        const { license_key, device_id, hardware_info } = req.body;
        
        if (!license_key) {
            const final_device_id = device_id || generateDeviceId(req, hardware_info);
            await logValidation('MISSING', final_device_id, req.ip, 'invalid', 'Missing license key');
            
            return res.status(400).json({
                valid: false,
                error: 'License key is required'
            });
        }

        // Get license from database
        const license = await models.License.findOne({ license_key });

        if (!license) {
            const final_device_id = device_id || generateDeviceId(req, hardware_info);
            await logValidation(license_key, final_device_id, req.ip, 'invalid', 'License not found');
            
            return res.status(404).json({
                valid: false,
                error: 'Invalid license key'
            });
        }

        // Check if license is revoked
        if (license.status === 'revoked') {
            const final_device_id = device_id || generateDeviceId(req, hardware_info);
            await logValidation(license_key, final_device_id, req.ip, 'invalid', 'License revoked');
            
            return res.status(403).json({
                valid: false,
                error: 'License has been revoked'
            });
        }

        // Check if license has expired
        if (license.expires_at && new Date(license.expires_at) < new Date()) {
            const final_device_id = device_id || generateDeviceId(req, hardware_info);
            await logValidation(license_key, final_device_id, req.ip, 'expired', 'License expired');
            
            return res.status(403).json({
                valid: false,
                error: 'License has expired',
                expires_at: license.expires_at
            });
        }

        // Use hardware_info to generate a stable HWID if provided
        const deviceIdToUse = device_id || generateDeviceId(req, hardware_info);
        
        // Check device activation limit
        const activationCount = await models.Activation.countDocuments({ license_id: license._id });

        // Check if this device is already activated
        const existingActivation = await models.Activation.findOne({ 
            license_id: license._id, 
            device_id: deviceIdToUse 
        });

        if (!existingActivation && activationCount >= license.max_activations) {
            await logValidation(license_key, deviceIdToUse, req.ip, 'limit_exceeded', 'Max activations reached');
            
            return res.status(403).json({
                valid: false,
                error: 'Maximum number of activations reached',
                max_activations: license.max_activations,
                current_activations: activationCount
            });
        }

        // Activate or update this device
        if (existingActivation) {
            existingActivation.last_seen = new Date();
            await existingActivation.save();
        } else {
            const activation = new models.Activation({
                license_id: license._id,
                device_id: deviceIdToUse
            });
            await activation.save();
        }

        await logValidation(license_key, deviceIdToUse, req.ip, 'valid', 'License validated successfully');

        res.json({
            valid: true,
            license: {
                key: license.license_key,
                status: license.status,
                customer_email: license.customer_email,
                expires_at: license.expires_at,
                max_activations: license.max_activations,
                current_activations: existingActivation ? activationCount : activationCount + 1,
                device_id: deviceIdToUse
            }
        });

    } catch (error) {
        console.error('License validation error:', error);
        res.status(500).json({
            valid: false,
            error: 'Validation failed'
        });
    }
});

// Heartbeat endpoint (client pings this periodically)
router.post('/heartbeat', verifyApiKey, async (req, res) => {
    try {
        const { license_key, device_id, hardware_info } = req.body;
        
        if (!license_key || (!device_id && !hardware_info)) {
            return res.status(400).json({ valid: false, error: 'Missing required parameters' });
        }

        const license = await models.License.findOne({ license_key, status: 'active' });
        if (!license) return res.status(404).json({ valid: false, error: 'License invalid or revoked' });

        const deviceIdToUse = device_id || generateDeviceId(req, hardware_info);
        const activation = await models.Activation.findOne({ license_id: license._id, device_id: deviceIdToUse });

        if (!activation) {
            return res.status(403).json({ valid: false, error: 'Device not activated' });
        }

        activation.last_seen = new Date();
        await activation.save();

        res.json({ valid: true, timestamp: new Date() });

    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ valid: false, error: 'Heartbeat failed' });
    }
});

// Helper function to log validation attempts
async function logValidation(licenseKey, deviceId, ipAddress, result, message) {
    try {
        const log = new models.ValidationLog({
            license_key: licenseKey,
            device_id: deviceId || null,
            ip_address: ipAddress || null,
            result,
            message
        });
        await log.save();
    } catch (err) {
        console.error('Failed to log validation:', err);
    }
}

// Deactivate a device (called when user wants to free up a slot)
router.post('/deactivate', verifyApiKey, async (req, res) => {
    try {
        const { license_key, device_id } = req.body;

        if (!license_key || !device_id) {
            return res.status(400).json({
                success: false,
                error: 'License key and device ID are required'
            });
        }

        // Get license
        const license = await models.License.findOne({ license_key });

        if (!license) {
            return res.status(404).json({
                success: false,
                error: 'License not found'
            });
        }

        // Delete activation
        await models.Activation.deleteOne({ 
            license_id: license._id, 
            device_id: device_id 
        });

        res.json({
            success: true,
            message: 'Device deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivation error:', error);
        res.status(500).json({
            success: false,
            error: 'Deactivation failed'
        });
    }
});

module.exports = router;
