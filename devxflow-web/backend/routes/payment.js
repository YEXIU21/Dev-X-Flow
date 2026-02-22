const express = require('express');
const crypto = require('crypto');
const { models } = require('../database');
const auth = require('./auth');

const router = express.Router();

// PayMongo configuration (test mode by default)
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || 'sk_test_key_here';
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY || 'pk_test_key_here';
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Create payment intent for GCash
router.post('/create-intent', async (req, res) => {
    try {
        const { email, amount = 99900 } = req.body; // Amount in centavos (₱999 = 99900)
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Create payment intent via PayMongo API
        const response = await fetch(`${PAYMONGO_API_URL}/payment_intents`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount,
                        currency: 'PHP',
                        payment_method_allowed: ['gcash'],
                        description: 'Dev-X-Flow License',
                        metadata: {
                            customer_email: email
                        }
                    }
                }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('PayMongo error:', data);
            return res.status(500).json({ 
                error: 'Failed to create payment intent',
                details: data.errors 
            });
        }
        
        // Store pending payment in database using MongoDB
        const payment = new models.Payment({
            payment_intent_id: data.data.id,
            customer_email: email,
            amount: amount / 100,
            status: 'pending'
        });
        await payment.save();
        
        res.json({
            success: true,
            client_key: data.data.attributes.client_key,
            payment_intent_id: data.data.id,
            amount: amount / 100
        });
        
    } catch (error) {
        console.error('Payment intent error:', error);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

// Webhook handler for PayMongo events
router.post('/webhook', async (req, res) => {
    try {
        const event = req.body;
        
        // Verify webhook signature (in production)
        // const signature = req.headers['paymongo-signature'];
        
        console.log('PayMongo webhook received:', event.type);
        
        if (event.type === 'payment.paid') {
            const paymentIntentId = event.data.attributes.payment_intent.id;
            const payment = await models.Payment.findOne({ payment_intent_id: paymentIntentId });
            
            if (payment && payment.status === 'pending') {
                // Update payment status
                payment.status = 'paid';
                payment.paid_at = new Date();
                await payment.save();
                
                // Generate license key
                const { v4: uuidv4 } = require('uuid');
                const licenseKey = uuidv4().toUpperCase().replace(/-/g, '').substring(0, 16);
                const formattedKey = `${licenseKey.substring(0, 4)}-${licenseKey.substring(4, 8)}-${licenseKey.substring(8, 12)}-${licenseKey.substring(12, 16)}`;
                
                // Create license in MongoDB
                const expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year license
                
                const license = new models.License({
                    license_key: formattedKey,
                    customer_email: payment.customer_email,
                    max_activations: 3,
                    expires_at: expiresAt
                });
                await license.save();
                
                console.log(`License generated for ${payment.customer_email}: ${formattedKey}`);
                
                // TODO: Send email with license key
                // For now, just log it
            }
        }
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Check payment status
router.get('/status/:paymentIntentId', async (req, res) => {
    try {
        const { paymentIntentId } = req.params;
        
        const payment = await models.Payment.findOne({ payment_intent_id: paymentIntentId });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Get associated license if paid (search by customer email)
        let license = null;
        if (payment.status === 'paid') {
            license = await models.License.findOne({ 
                customer_email: payment.customer_email 
            }).sort({ created_at: -1 });
        }
        
        res.json({
            success: true,
            status: payment.status,
            amount: payment.amount,
            license_key: license ? license.license_key : null
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Status check failed' });
    }
});

// Manual payment verification (for admin)
router.post('/verify-manual', auth.verifyToken, async (req, res) => {
    try {
        const { payment_id, reference_number } = req.body;
        
        // Get payment first
        const payment = await models.Payment.findById(payment_id);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Update payment as verified
        payment.status = 'paid';
        payment.reference_number = reference_number;
        payment.verified_at = new Date();
        await payment.save();
        
        // Generate license
        const { v4: uuidv4 } = require('uuid');
        const licenseKey = uuidv4().toUpperCase().replace(/-/g, '').substring(0, 16);
        const formattedKey = `${licenseKey.substring(0, 4)}-${licenseKey.substring(4, 8)}-${licenseKey.substring(8, 12)}-${licenseKey.substring(12, 16)}`;
        
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        
        const license = new models.License({
            license_key: formattedKey,
            customer_email: payment.customer_email,
            max_activations: 3,
            expires_at: expiresAt
        });
        await license.save();
        
        res.json({
            success: true,
            license_key: formattedKey,
            message: 'Payment verified and license generated'
        });
        
    } catch (error) {
        console.error('Manual verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;
