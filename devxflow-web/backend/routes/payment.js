const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');
const { models } = require('../database');
const auth = require('./auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for file uploads (in-memory storage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Plan pricing (in PHP)
const PLAN_PRICES = {
    'pro': 199,
    'pro_plus': 299,
    'teams': 599,
    'basic': 399,
    'professional': 899
};

// Get GCash QR code URL (from database or fallback to env)
router.get('/qr', async (req, res) => {
    try {
        // Try to get settings from database first
        const settings = await models.PaymentSettings.findOne({ setting_id: 'default' });
        
        if (settings) {
            return res.json({
                success: true,
                qr_url: settings.qr_image_url,
                gcash_number: settings.gcash_number,
                gcash_account_name: settings.gcash_account_name || ''
            });
        }
        
        // Fallback to environment variables
        const qrPublicId = process.env.GCASH_QR_PUBLIC_ID || 'devxflow-gcash-qr';
        const qrUrl = cloudinary.url(qrPublicId, {
            secure: true,
            transformation: { width: 400, height: 400, crop: 'fill' }
        });
        
        res.json({
            success: true,
            qr_url: qrUrl,
            gcash_number: process.env.GCASH_NUMBER || '09XX XXX XXXX',
            gcash_account_name: ''
        });
    } catch (error) {
        console.error('QR fetch error:', error);
        res.status(500).json({ error: 'Failed to get QR code' });
    }
});

// Submit payment proof (QR-based GCash payment)
router.post('/submit-proof', upload.single('screenshot'), async (req, res) => {
    try {
        const { email, name, plan, gcash_ref } = req.body;
        
        // Validate required fields
        if (!email || !name || !plan || !gcash_ref) {
            return res.status(400).json({ 
                error: 'Email, name, plan, and GCash reference are required' 
            });
        }
        
        const validPlans = ['pro', 'pro_plus', 'teams', 'basic', 'professional'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ 
                error: 'Invalid plan. Must be one of the following: "pro", "pro_plus", "teams", "basic", "professional"' 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ 
                error: 'Payment screenshot is required' 
            });
        }
        
        // Upload screenshot to Cloudinary
        const uploadFromBuffer = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { 
                        folder: 'payment-proofs',
                        resource_type: 'image'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };
        
        const uploadResult = await uploadFromBuffer();
        
        // Create payment record
        const payment = new models.Payment({
            customer_email: email,
            customer_name: name,
            amount: PLAN_PRICES[plan],
            plan: plan,
            gcash_reference: gcash_ref,
            proof_image_url: uploadResult.secure_url,
            status: 'pending'
        });
        await payment.save();
        
        console.log(`Payment submitted: ${payment._id} by ${email}`);
        
        res.json({
            success: true,
            payment_id: payment._id,
            message: 'Payment submitted successfully. We will verify and send your license key within 24 hours.'
        });
        
    } catch (error) {
        console.error('Payment submission error:', error);
        res.status(500).json({ error: 'Payment submission failed' });
    }
});

// Check payment status by ID
router.get('/status/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const payment = await models.Payment.findById(paymentId);
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({
            success: true,
            status: payment.status,
            amount: payment.amount,
            plan: payment.plan,
            license_key: payment.license_key || null,
            submitted_at: payment.created_at,
            verified_at: payment.verified_at
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Status check failed' });
    }
});

// Get all payments for current user (by email)
router.get('/my-payments', async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const payments = await models.Payment.find({ customer_email: email })
            .sort({ created_at: -1 })
            .select('-proof_image_url'); // Don't return proof image URL
        
        res.json({
            success: true,
            payments: payments
        });
        
    } catch (error) {
        console.error('My payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// ============================================
// ADMIN ROUTES (require authentication)
// ============================================

// Get payment settings (admin)
router.get('/admin/settings', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const settings = await models.PaymentSettings.findOne({ setting_id: 'default' });
        
        if (!settings) {
            return res.json({
                success: true,
                settings: null,
                message: 'No settings configured. Using environment defaults.'
            });
        }
        
        res.json({
            success: true,
            settings: {
                qr_image_url: settings.qr_image_url,
                qr_public_id: settings.qr_public_id,
                gcash_number: settings.gcash_number,
                gcash_account_name: settings.gcash_account_name,
                updated_at: settings.updated_at
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get payment settings' });
    }
});

// Update payment settings (admin) - with QR image upload
router.post('/admin/settings', auth.verifyToken, auth.isAdmin, upload.single('qr_image'), async (req, res) => {
    try {
        const { gcash_number, gcash_account_name } = req.body;
        
        if (!gcash_number) {
            return res.status(400).json({ error: 'GCash number is required' });
        }
        
        let qrImageUrl = '';
        let qrPublicId = '';
        
        // If new QR image uploaded, upload to Cloudinary
        if (req.file) {
            const uploadFromBuffer = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { 
                            folder: 'payment-qr',
                            resource_type: 'image'
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };
            
            const uploadResult = await uploadFromBuffer();
            qrImageUrl = uploadResult.secure_url;
            qrPublicId = uploadResult.public_id;
        }
        
        // Update or create settings
        const existingSettings = await models.PaymentSettings.findOne({ setting_id: 'default' });
        
        if (existingSettings) {
            // Delete old QR image from Cloudinary if new one uploaded
            if (qrPublicId && existingSettings.qr_public_id) {
                try {
                    await cloudinary.uploader.destroy(existingSettings.qr_public_id);
                } catch (e) {
                    console.log('Failed to delete old QR image:', e.message);
                }
            }
            
            existingSettings.qr_image_url = qrImageUrl || existingSettings.qr_image_url;
            existingSettings.qr_public_id = qrPublicId || existingSettings.qr_public_id;
            existingSettings.gcash_number = gcash_number;
            existingSettings.gcash_account_name = gcash_account_name || '';
            existingSettings.updated_at = new Date();
            existingSettings.updated_by = req.user.adminId;
            await existingSettings.save();
            
            console.log(`Payment settings updated by admin ${req.user.adminId}`);
            
            return res.json({
                success: true,
                message: 'Payment settings updated successfully',
                settings: {
                    qr_image_url: existingSettings.qr_image_url,
                    qr_public_id: existingSettings.qr_public_id,
                    gcash_number: existingSettings.gcash_number,
                    gcash_account_name: existingSettings.gcash_account_name
                }
            });
        }
        
        // Create new settings
        if (!qrImageUrl) {
            return res.status(400).json({ error: 'QR image is required for initial setup' });
        }
        
        const newSettings = new models.PaymentSettings({
            setting_id: 'default',
            qr_image_url: qrImageUrl,
            qr_public_id: qrPublicId,
            gcash_number: gcash_number,
            gcash_account_name: gcash_account_name || '',
            updated_by: req.user.adminId
        });
        await newSettings.save();
        
        console.log(`Payment settings created by admin ${req.user.adminId}`);
        
        res.json({
            success: true,
            message: 'Payment settings created successfully',
            settings: {
                qr_image_url: newSettings.qr_image_url,
                qr_public_id: newSettings.qr_public_id,
                gcash_number: newSettings.gcash_number,
                gcash_account_name: newSettings.gcash_account_name
            }
        });
        
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update payment settings' });
    }
});

// Get all pending payments (admin)
router.get('/admin/pending', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const payments = await models.Payment.find({ status: 'pending' })
            .sort({ created_at: -1 });
        
        res.json({
            success: true,
            count: payments.length,
            payments: payments
        });
        
    } catch (error) {
        console.error('Pending payments error:', error);
        res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
});

// Get all payments (admin)
router.get('/admin/all', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        
        const filter = status ? { status } : {};
        const payments = await models.Payment.find(filter)
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .populate('verified_by', 'username');
        
        res.json({
            success: true,
            count: payments.length,
            payments: payments
        });
        
    } catch (error) {
        console.error('All payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Verify payment and generate license (admin)
router.post('/admin/verify/:paymentId', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const payment = await models.Payment.findById(paymentId);
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ 
                error: `Payment already ${payment.status}` 
            });
        }
        
        // Generate license key
        const licenseKey = uuidv4().toUpperCase().replace(/-/g, '').substring(0, 16);
        const formattedKey = `${licenseKey.substring(0, 4)}-${licenseKey.substring(4, 8)}-${licenseKey.substring(8, 12)}-${licenseKey.substring(12, 16)}`;
        
        // Calculate expiration based on plan
        const expiresAt = new Date();
        if (payment.plan === 'basic') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year
        } else {
            expiresAt.setFullYear(expiresAt.getFullYear() + 3); // 3 years
        }
        
        // Create license
        const license = new models.License({
            license_key: formattedKey,
            customer_email: payment.customer_email,
            tier: payment.plan === 'basic' ? 'pro' : 'pro_plus',
            max_activations: payment.plan === 'basic' ? 3 : 5,
            expires_at: expiresAt
        });
        await license.save();
        
        // Update payment status
        payment.status = 'verified';
        payment.verified_at = new Date();
        payment.verified_by = req.user.adminId;
        payment.license_key = formattedKey;
        await payment.save();
        
        console.log(`Payment verified: ${paymentId} - License: ${formattedKey}`);
        
        res.json({
            success: true,
            license_key: formattedKey,
            customer_email: payment.customer_email,
            message: 'Payment verified and license generated'
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Reject payment (admin)
router.post('/admin/reject/:paymentId', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;
        
        const payment = await models.Payment.findById(paymentId);
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ 
                error: `Payment already ${payment.status}` 
            });
        }
        
        // Update payment status
        payment.status = 'rejected';
        payment.verified_at = new Date();
        payment.verified_by = req.user.adminId;
        await payment.save();
        
        console.log(`Payment rejected: ${paymentId} - Reason: ${reason || 'No reason provided'}`);
        
        res.json({
            success: true,
            message: 'Payment rejected'
        });
        
    } catch (error) {
        console.error('Rejection error:', error);
        res.status(500).json({ error: 'Rejection failed' });
    }
});

// Legacy routes for backward compatibility (PayMongo - kept but not used)
// Create payment intent for GCash (PayMongo - legacy)
router.post('/create-intent', async (req, res) => {
    res.status(400).json({ 
        error: 'PayMongo integration disabled. Please use QR-based payment.',
        use_qr_payment: true
    });
});

// Webhook handler for PayMongo events (legacy)
router.post('/webhook', async (req, res) => {
    res.json({ received: true, message: 'PayMongo webhooks disabled' });
});

module.exports = router;
