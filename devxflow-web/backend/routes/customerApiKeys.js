const express = require('express');
const jwt = require('jsonwebtoken');
const { models } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devxflow-secret-key-change-in-production';

// Auth middleware for customers
const authCustomer = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const customer = await models.Customer.findById(decoded.customerId);
        if (!customer) {
            return res.status(401).json({ error: 'Customer not found' });
        }

        req.customer = customer;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Mask API key for display
const maskKey = (key) => {
    if (!key || key.length < 8) return '••••••••';
    return key.substring(0, 4) + '••••••' + key.substring(key.length - 4);
};

// Get customer's API keys (masked)
router.get('/', authCustomer, async (req, res) => {
    try {
        const customer = req.customer;
        const apiKeys = customer.api_keys || {};
        
        // Return masked keys
        const maskedKeys = {};
        for (const [provider, data] of Object.entries(apiKeys)) {
            if (data && data.key) {
                maskedKeys[provider] = {
                    masked: maskKey(data.key),
                    added_at: data.added_at,
                    has_key: true
                };
            }
        }

        res.json({ 
            success: true, 
            api_keys: maskedKeys,
            providers: ['openai', 'anthropic', 'google', 'deepseek', 'mistral', 'openrouter']
        });
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Failed to get API keys' });
    }
});

// Add or update API key for a provider
router.post('/', authCustomer, async (req, res) => {
    try {
        const { provider, key } = req.body;
        
        if (!provider || !key) {
            return res.status(400).json({ error: 'Provider and key are required' });
        }

        const validProviders = ['openai', 'anthropic', 'google', 'deepseek', 'mistral', 'openrouter'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        const customer = req.customer;
        
        // Initialize api_keys if not exists
        if (!customer.api_keys) {
            customer.api_keys = {};
        }

        // Store the key
        customer.api_keys[provider] = {
            key: key,
            added_at: new Date()
        };

        await customer.save();

        res.json({ 
            success: true, 
            message: `${provider} API key saved`,
            masked: maskKey(key)
        });
    } catch (error) {
        console.error('Save API key error:', error);
        res.status(500).json({ error: 'Failed to save API key' });
    }
});

// Remove API key for a provider
router.delete('/:provider', authCustomer, async (req, res) => {
    try {
        const { provider } = req.params;
        const customer = req.customer;

        if (customer.api_keys && customer.api_keys[provider]) {
            delete customer.api_keys[provider];
            await customer.save();
        }

        res.json({ 
            success: true, 
            message: `${provider} API key removed` 
        });
    } catch (error) {
        console.error('Remove API key error:', error);
        res.status(500).json({ error: 'Failed to remove API key' });
    }
});

// Test API key validity
router.post('/test', authCustomer, async (req, res) => {
    try {
        const { provider, key } = req.body;
        
        if (!provider || !key) {
            return res.status(400).json({ error: 'Provider and key are required' });
        }

        let isValid = false;
        let error = null;

        // Test the key with actual API call
        try {
            switch (provider) {
                case 'openai':
                    const openaiRes = await fetch('https://api.openai.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${key}` }
                    });
                    isValid = openaiRes.ok;
                    if (!isValid) error = 'Invalid OpenAI API key';
                    break;

                case 'anthropic':
                    // Anthropic doesn't have a simple validation endpoint
                    // We'll just check the format
                    isValid = key.startsWith('sk-ant-');
                    if (!isValid) error = 'Invalid Anthropic API key format';
                    break;

                case 'google':
                    const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
                    isValid = googleRes.ok;
                    if (!isValid) error = 'Invalid Google API key';
                    break;

                case 'deepseek':
                    const deepseekRes = await fetch('https://api.deepseek.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${key}` }
                    });
                    isValid = deepseekRes.ok;
                    if (!isValid) error = 'Invalid DeepSeek API key';
                    break;

                case 'mistral':
                    const mistralRes = await fetch('https://api.mistral.ai/v1/models', {
                        headers: { 'Authorization': `Bearer ${key}` }
                    });
                    isValid = mistralRes.ok;
                    if (!isValid) error = 'Invalid Mistral API key';
                    break;

                case 'openrouter':
                    const openrouterRes = await fetch('https://openrouter.ai/api/v1/models', {
                        headers: { 'Authorization': `Bearer ${key}` }
                    });
                    isValid = openrouterRes.ok;
                    if (!isValid) error = 'Invalid OpenRouter API key';
                    break;

                default:
                    error = 'Unknown provider';
            }
        } catch (e) {
            error = 'Connection failed during validation';
        }

        res.json({ 
            success: true, 
            valid: isValid,
            error: error
        });
    } catch (error) {
        console.error('Test API key error:', error);
        res.status(500).json({ error: 'Failed to test API key' });
    }
});

// Get full API keys for Electron app (authenticated via customer token)
router.get('/full', authCustomer, async (req, res) => {
    try {
        const customer = req.customer;
        const apiKeys = customer.api_keys || {};
        
        // Return actual keys (for Electron app use)
        const keys = {};
        for (const [provider, data] of Object.entries(apiKeys)) {
            if (data && data.key) {
                keys[provider] = data.key;
            }
        }

        res.json({ 
            success: true, 
            api_keys: keys
        });
    } catch (error) {
        console.error('Get full API keys error:', error);
        res.status(500).json({ error: 'Failed to get API keys' });
    }
});

module.exports = router;
