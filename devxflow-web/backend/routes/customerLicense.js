const express = require('express');
const jwt = require('jsonwebtoken');
const { models } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devxflow-customer-secret-key';

// Customer token verification middleware
function verifyCustomerToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }
    
    req.customerId = decoded.customerId;
    req.customerEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Get current customer's license status
router.get('/status', verifyCustomerToken, async (req, res) => {
  try {
    const customer = await models.Customer.findById(req.customerId).lean();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer has a license
    const license = await models.License.findOne({ 
      customer_email: customer.email,
      status: 'active'
    }).lean();

    if (!license) {
      // Check for trial
      const trial = customer.trial_started_at ? {
        started: true,
        started_at: customer.trial_started_at,
        expires_at: customer.trial_expires_at,
        days_remaining: Math.max(0, Math.ceil((new Date(customer.trial_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
      } : null;

      return res.json({
        success: true,
        has_license: false,
        trial,
        tier: 'free',
        features: ['Basic AI assistance', '5 commits/day', 'Single project']
      });
    }

    // Get activations for this license
    const activations = await models.Activation.find({ 
      license_id: license._id 
    }).lean();

    res.json({
      success: true,
      has_license: true,
      license: {
        key: maskLicenseKey(license.license_key),
        tier: license.tier || 'pro',
        status: license.status,
        expires_at: license.expires_at,
        max_activations: license.max_activations,
        current_activations: activations.length
      },
      devices: activations.map(a => ({
        id: a.device_id,
        name: a.device_name || 'Unknown Device',
        activated_at: a.activated_at,
        last_seen: a.last_seen || a.activated_at
      })),
      features: getTierFeatures(license.tier || 'pro')
    });

  } catch (error) {
    console.error('License status error:', error);
    res.status(500).json({ error: 'Failed to get license status' });
  }
});

// Start trial
router.post('/trial/start', verifyCustomerToken, async (req, res) => {
  try {
    const customer = await models.Customer.findById(req.customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.trial_started_at) {
      return res.status(400).json({ 
        error: 'Trial already started',
        trial: {
          started_at: customer.trial_started_at,
          expires_at: customer.trial_expires_at
        }
      });
    }

    // Start 14-day trial
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 14);

    customer.trial_started_at = now;
    customer.trial_expires_at = expiresAt;
    await customer.save();

    res.json({
      success: true,
      trial: {
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        days: 14
      },
      features: getTierFeatures('trial')
    });

  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ error: 'Failed to start trial' });
  }
});

// Activate a license key
router.post('/activate', verifyCustomerToken, async (req, res) => {
  try {
    const { license_key, device_id, device_name } = req.body;

    if (!license_key || !device_id) {
      return res.status(400).json({ 
        error: 'License key and device ID are required' 
      });
    }

    const customer = await models.Customer.findById(req.customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find the license
    const license = await models.License.findOne({ 
      license_key: license_key.toUpperCase(),
      status: 'active'
    });

    if (!license) {
      return res.status(400).json({ 
        error: 'Invalid or expired license key' 
      });
    }

    // Check if license is expired
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return res.status(400).json({ 
        error: 'License has expired' 
      });
    }

    // Enterprise license handling
    if (license.tier === 'enterprise') {
      // Check if customer email matches license owner or is in team_members
      const isOwner = license.customer_email === customer.email;
      const isTeamMember = license.team_members?.some(m => m.email === customer.email);
      
      if (!isOwner && !isTeamMember) {
        // First activation - set as enterprise admin
        if (!license.customer_email) {
          license.customer_email = customer.email;
          customer.enterprise_id = license._id;
          customer.enterprise_role = 'admin';
          customer.status = 'enterprise';
          
          // Add to team_members as admin
          if (!license.team_members) license.team_members = [];
          license.team_members.push({
            email: customer.email,
            status: 'active',
            added_at: new Date(),
            activated_at: new Date()
          });
          license.seats_used = license.team_members.length;
          
          await license.save();
          await customer.save();
        } else {
          // Not in team - check if seats available
          if (license.seats_used >= license.seats) {
            return res.status(400).json({ 
              error: 'No seats available in this enterprise license. Contact your administrator.' 
            });
          }
          
          // Add as team member
          if (!license.team_members) license.team_members = [];
          license.team_members.push({
            email: customer.email,
            status: 'active',
            added_at: new Date(),
            activated_at: new Date()
          });
          license.seats_used = license.team_members.length;
          
          customer.enterprise_id = license._id;
          customer.enterprise_role = 'member';
          customer.status = 'enterprise';
          
          await license.save();
          await customer.save();
        }
      } else if (isTeamMember) {
        // Already in team - update status if pending
        const memberIndex = license.team_members.findIndex(m => m.email === customer.email);
        if (license.team_members[memberIndex].status === 'pending') {
          license.team_members[memberIndex].status = 'active';
          license.team_members[memberIndex].activated_at = new Date();
          await license.save();
        }
        
        customer.enterprise_id = license._id;
        if (!customer.enterprise_role) {
          customer.enterprise_role = isOwner ? 'admin' : 'member';
        }
        customer.status = 'enterprise';
        await customer.save();
      }
    }

    // Check activation limit
    const existingActivations = await models.Activation.countDocuments({ 
      license_id: license._id 
    });

    if (existingActivations >= license.max_activations) {
      // Check if this device is already activated
      const existingDevice = await models.Activation.findOne({
        license_id: license._id,
        device_id
      });

      if (!existingDevice) {
        return res.status(400).json({ 
          error: 'Maximum device activations reached',
          max_activations: license.max_activations,
          current_activations: existingActivations
        });
      }
    }

    // Create or update activation
    const activation = await models.Activation.findOneAndUpdate(
      { license_id: license._id, device_id },
      {
        license_id: license._id,
        device_id,
        device_name: device_name || 'Unknown Device',
        activated_at: new Date(),
        last_seen: new Date()
      },
      { upsert: true, new: true }
    );

    // Update license customer email if not set (non-enterprise)
    if (!license.customer_email && license.tier !== 'enterprise') {
      license.customer_email = customer.email;
      await license.save();
    }

    res.json({
      success: true,
      license: {
        key: maskLicenseKey(license.license_key),
        tier: license.tier || 'pro',
        status: license.status,
        expires_at: license.expires_at,
        max_activations: license.max_activations
      },
      device: {
        id: device_id,
        name: device_name || 'Unknown Device',
        activated_at: activation.activated_at
      },
      enterprise: license.tier === 'enterprise' ? {
        role: customer.enterprise_role,
        seats: license.seats,
        seats_used: license.seats_used
      } : null,
      features: getTierFeatures(license.tier || 'pro')
    });

  } catch (error) {
    console.error('Activate license error:', error);
    res.status(500).json({ error: 'Failed to activate license' });
  }
});

// Deactivate a device
router.delete('/device/:device_id', verifyCustomerToken, async (req, res) => {
  try {
    const { device_id } = req.params;
    const customer = await models.Customer.findById(req.customerId).lean();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find license for this customer
    const license = await models.License.findOne({ 
      customer_email: customer.email,
      status: 'active'
    });

    if (!license) {
      return res.status(404).json({ error: 'No active license found' });
    }

    // Remove activation
    const result = await models.Activation.deleteOne({
      license_id: license._id,
      device_id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      success: true,
      message: 'Device deactivated successfully'
    });

  } catch (error) {
    console.error('Deactivate device error:', error);
    res.status(500).json({ error: 'Failed to deactivate device' });
  }
});

// Get billing history
router.get('/billing', verifyCustomerToken, async (req, res) => {
  try {
    const customer = await models.Customer.findById(req.customerId).lean();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // For now, return empty billing history
    // In production, this would query a payments/orders collection
    res.json({
      success: true,
      billing: [],
      message: 'No billing history available'
    });

  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ error: 'Failed to get billing history' });
  }
});

// Helper: Mask license key for display
function maskLicenseKey(key) {
  if (!key || key.length < 8) return key;
  return key.substring(0, 4) + '-****-****-' + key.substring(key.length - 4);
}

// Helper: Get features for tier
function getTierFeatures(tier) {
  const features = {
    free: [
      'Basic AI assistance',
      '5 commits/day',
      'Single project',
      'Community support'
    ],
    trial: [
      'Full AI assistance',
      'Unlimited commits',
      'Unlimited projects',
      'All AI providers',
      'Priority support'
    ],
    pro: [
      'Full AI assistance',
      'Unlimited commits',
      'Unlimited projects',
      'All AI providers',
      'Priority support',
      'Custom prompts'
    ],
    'pro-plus': [
      'Everything in Pro',
      'Team collaboration (3 users)',
      'Advanced analytics',
      'Custom integrations',
      'API access'
    ],
    teams: [
      'Everything in Pro Plus',
      'Unlimited team members',
      'SSO authentication',
      'Dedicated support',
      'Custom branding',
      'On-premise option'
    ],
    enterprise: [
      'Everything in Teams',
      'Unlimited seats',
      'Dedicated account manager',
      'Custom SLA',
      'On-premise deployment',
      'Priority feature requests',
      'Enterprise SSO/SAML',
      'Audit logs'
    ]
  };
  
  return features[tier] || features.free;
}

module.exports = router;
