const express = require('express');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();

// Trial configuration
const TRIAL_DAYS = 30;
const MAX_TRIALS_PER_DEVICE = 1;

// Generate device fingerprint
function generateDeviceFingerprint(deviceInfo) {
    const data = JSON.stringify(deviceInfo);
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Start trial
router.post('/start', async (req, res) => {
    try {
        const { email, device_info } = req.body;
        
        // Validation
        if (!email || !device_info) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Email and device info required' 
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Invalid email address' 
            });
        }
        
        // Generate device fingerprint
        const deviceFingerprint = generateDeviceFingerprint(device_info);
        
        // Check if device has already used trial
        const existingTrial = await db.get(
            `SELECT * FROM trials 
             WHERE (device_fingerprint = ? OR email = ?) 
             AND status != 'expired'`,
            [deviceFingerprint, email.toLowerCase()]
        );
        
        if (existingTrial) {
            // Check if trial is still active
            const now = new Date();
            const trialEnd = new Date(existingTrial.trial_ends_at);
            
            if (now < trialEnd && existingTrial.status === 'active') {
                // Trial exists and is active
                return res.json({
                    valid: true,
                    trial_id: existingTrial.id,
                    trial_ends_at: existingTrial.trial_ends_at,
                    days_remaining: Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)),
                    message: 'Trial already active'
                });
            } else {
                // Trial expired
                await db.run(
                    'UPDATE trials SET status = ? WHERE id = ?',
                    ['expired', existingTrial.id]
                );
                
                return res.status(403).json({
                    valid: false,
                    error: 'Trial already used on this device or email',
                    code: 'TRIAL_USED'
                });
            }
        }
        
        // Create new trial
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        
        const result = await db.run(
            `INSERT INTO trials (email, device_fingerprint, device_info, trial_ends_at, status) 
             VALUES (?, ?, ?, ?, ?)`,
            [email.toLowerCase(), deviceFingerprint, JSON.stringify(device_info), 
             trialEndsAt.toISOString(), 'active']
        );
        
        res.json({
            valid: true,
            trial_id: result.id,
            trial_ends_at: trialEndsAt.toISOString(),
            days_remaining: TRIAL_DAYS,
            message: 'Trial started successfully'
        });
        
    } catch (error) {
        console.error('Trial start error:', error);
        res.status(500).json({ 
            valid: false, 
            error: 'Trial initialization failed' 
        });
    }
});

// Validate trial
router.post('/validate', async (req, res) => {
    try {
        const { trial_id, device_info } = req.body;
        
        if (!trial_id || !device_info) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Trial ID and device info required' 
            });
        }
        
        // Generate device fingerprint
        const deviceFingerprint = generateDeviceFingerprint(device_info);
        
        // Get trial
        const trial = await db.get(
            `SELECT * FROM trials WHERE id = ?`,
            [trial_id]
        );
        
        if (!trial) {
            return res.json({
                valid: false,
                error: 'Trial not found',
                code: 'TRIAL_NOT_FOUND'
            });
        }
        
        // Check if device fingerprint matches
        if (trial.device_fingerprint !== deviceFingerprint) {
            return res.json({
                valid: false,
                error: 'Device mismatch - trial is tied to original device',
                code: 'DEVICE_MISMATCH'
            });
        }
        
        // Check trial status
        if (trial.status === 'expired') {
            return res.json({
                valid: false,
                error: 'Trial has expired',
                code: 'TRIAL_EXPIRED'
            });
        }
        
        // Check if trial period is still valid
        const now = new Date();
        const trialEnd = new Date(trial.trial_ends_at);
        
        if (now > trialEnd) {
            // Mark as expired
            await db.run(
                'UPDATE trials SET status = ? WHERE id = ?',
                ['expired', trial_id]
            );
            
            return res.json({
                valid: false,
                error: 'Trial period has ended',
                code: 'TRIAL_ENDED'
            });
        }
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        
        // Update last check
        await db.run(
            'UPDATE trials SET last_validated_at = datetime("now") WHERE id = ?',
            [trial_id]
        );
        
        res.json({
            valid: true,
            trial_ends_at: trial.trial_ends_at,
            days_remaining: daysRemaining,
            email: trial.email
        });
        
    } catch (error) {
        console.error('Trial validation error:', error);
        res.status(500).json({ 
            valid: false, 
            error: 'Validation failed' 
        });
    }
});

// Get trial info (admin only)
router.get('/all', async (req, res) => {
    try {
        // In production, add authentication middleware
        const trials = await db.all(
            `SELECT id, email, device_fingerprint, trial_ends_at, status, 
                    datetime(created_at) as created_at
             FROM trials 
             ORDER BY created_at DESC`
        );
        
        res.json({
            success: true,
            count: trials.length,
            trials
        });
        
    } catch (error) {
        console.error('Get trials error:', error);
        res.status(500).json({ error: 'Failed to retrieve trials' });
    }
});

module.exports = router;
