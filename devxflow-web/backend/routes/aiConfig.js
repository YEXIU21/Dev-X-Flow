const express = require('express');
const { models } = require('../database');
const auth = require('./auth');

const router = express.Router();

// AI Configuration Schema - Multiple API keys for auto-fallback
const mongoose = require('mongoose');
const aiConfigSchema = new mongoose.Schema({
    // Multiple API keys for different providers
    openaiKey: { type: String, default: '' },
    anthropicKey: { type: String, default: '' },
    googleKey: { type: String, default: '' },
    mistralKey: { type: String, default: '' },
    cohereKey: { type: String, default: '' },
    xaiKey: { type: String, default: '' },
    perplexityKey: { type: String, default: '' },
    deepseekKey: { type: String, default: '' },
    kimiKey: { type: String, default: '' },
    qwenKey: { type: String, default: '' },
    chatglmKey: { type: String, default: '' },
    baichuanKey: { type: String, default: '' },
    yiKey: { type: String, default: '' },
    openrouterKey: { type: String, default: '' },
    togetherKey: { type: String, default: '' },
    groqKey: { type: String, default: '' },
    fireworksKey: { type: String, default: '' },
    ollamaUrl: { type: String, default: '' },
    azureKey: { type: String, default: '' },
    customKey: { type: String, default: '' },
    customUrl: { type: String, default: '' },
    // Fallback order
    fallbackOrder: { type: [String], default: ['google', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere'] },
    // Metadata
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

let AIConfig;
try {
    AIConfig = mongoose.model('AIConfig');
} catch {
    AIConfig = mongoose.model('AIConfig', aiConfigSchema);
}

// Helper to mask API key
const maskKey = (key) => key ? '••••••••' + key.slice(-4) : '';

// Get AI configuration (admin only) - returns masked keys
router.get('/', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const config = await AIConfig.findOne().sort({ updated_at: -1 });
        
        if (!config) {
            return res.json({ success: true, config: null });
        }
        
        // Return masked keys for security
        res.json({
            success: true,
            config: {
                openaiKey: maskKey(config.openaiKey),
                anthropicKey: maskKey(config.anthropicKey),
                googleKey: maskKey(config.googleKey),
                mistralKey: maskKey(config.mistralKey),
                cohereKey: maskKey(config.cohereKey),
                xaiKey: maskKey(config.xaiKey),
                perplexityKey: maskKey(config.perplexityKey),
                deepseekKey: maskKey(config.deepseekKey),
                kimiKey: maskKey(config.kimiKey),
                qwenKey: maskKey(config.qwenKey),
                chatglmKey: maskKey(config.chatglmKey),
                baichuanKey: maskKey(config.baichuanKey),
                yiKey: maskKey(config.yiKey),
                openrouterKey: maskKey(config.openrouterKey),
                togetherKey: maskKey(config.togetherKey),
                groqKey: maskKey(config.groqKey),
                fireworksKey: maskKey(config.fireworksKey),
                ollamaUrl: config.ollamaUrl,
                azureKey: maskKey(config.azureKey),
                customKey: maskKey(config.customKey),
                customUrl: config.customUrl,
                fallbackOrder: config.fallbackOrder
            }
        });
    } catch (error) {
        console.error('Get AI config error:', error);
        res.status(500).json({ error: 'Failed to get AI config' });
    }
});

// Save AI configuration (admin only)
router.post('/', auth.verifyToken, auth.isAdmin, async (req, res) => {
    try {
        const existing = await AIConfig.findOne().sort({ updated_at: -1 });
        
        // Build update object, keeping existing keys if masked
        const updateData = { updated_at: new Date() };
        const keyFields = [
            'openaiKey', 'anthropicKey', 'googleKey', 'mistralKey', 'cohereKey',
            'xaiKey', 'perplexityKey', 'deepseekKey', 'kimiKey', 'qwenKey',
            'chatglmKey', 'baichuanKey', 'yiKey', 'openrouterKey', 'togetherKey',
            'groqKey', 'fireworksKey', 'azureKey', 'customKey'
        ];
        
        for (const field of keyFields) {
            const value = req.body[field];
            // If masked (starts with ••••), keep existing
            if (value && value.startsWith('••••')) {
                updateData[field] = existing?.[field] || '';
            } else {
                updateData[field] = value || '';
            }
        }
        
        // URL fields (not masked)
        updateData.ollamaUrl = req.body.ollamaUrl || '';
        updateData.customUrl = req.body.customUrl || '';
        updateData.fallbackOrder = req.body.fallbackOrder || ['google', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere'];
        
        // Save new config
        const config = await AIConfig.findOneAndUpdate(
            {},
            updateData,
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'AI configuration saved'
        });
    } catch (error) {
        console.error('Save AI config error:', error);
        res.status(500).json({ error: 'Failed to save AI config' });
    }
});

// Get AI configuration for desktop app (requires API key auth)
// Returns all keys for auto-fallback
router.get('/public', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (apiKey !== process.env.DESKTOP_API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const config = await AIConfig.findOne().sort({ updated_at: -1 });
        
        if (!config) {
            return res.status(404).json({ error: 'AI config not set' });
        }

        // Return all keys for auto-fallback
        res.json({
            success: true,
            config: {
                openaiKey: config.openaiKey,
                anthropicKey: config.anthropicKey,
                googleKey: config.googleKey,
                mistralKey: config.mistralKey,
                cohereKey: config.cohereKey,
                xaiKey: config.xaiKey,
                perplexityKey: config.perplexityKey,
                deepseekKey: config.deepseekKey,
                kimiKey: config.kimiKey,
                qwenKey: config.qwenKey,
                chatglmKey: config.chatglmKey,
                baichuanKey: config.baichuanKey,
                yiKey: config.yiKey,
                openrouterKey: config.openrouterKey,
                togetherKey: config.togetherKey,
                groqKey: config.groqKey,
                fireworksKey: config.fireworksKey,
                ollamaUrl: config.ollamaUrl,
                azureKey: config.azureKey,
                customKey: config.customKey,
                customUrl: config.customUrl,
                fallbackOrder: config.fallbackOrder
            }
        });
    } catch (error) {
        console.error('Get public AI config error:', error);
        res.status(500).json({ error: 'Failed to get AI config' });
    }
});

module.exports = router;
