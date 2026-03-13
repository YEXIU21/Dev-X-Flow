const express = require('express');
const { models } = require('../database');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devxflow-secret-key-change-in-production';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_uancg1j';
const EMAILJS_TEMPLATE_ID = 'template_9qsanyf';
const EMAILJS_PUBLIC_KEY = 'prslQVSP7JtsOzycN';

// Send invitation email via EmailJS REST API
async function sendInvitationEmail(toEmail, adminName, seats) {
    try {
        const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                to_email: toEmail,
                from_name: adminName,
                title: 'You\'ve been invited to Dev-X-Flow Enterprise',
                message: `You have been invited by ${adminName} to join their Dev-X-Flow Enterprise team (${seats} seats).\n\nTo accept the invitation:\n1. Register at devxflow.com/register\n2. Use the same email address: ${toEmail}\n3. Your account will be automatically linked to the enterprise license.\n\nWelcome to the team!`
            }
        });
        console.log(`[EmailJS] Invitation sent to ${toEmail}`);
        return response.data;
    } catch (err) {
        console.error('[EmailJS] Failed to send invitation:', err.message);
        // Don't throw - email failure shouldn't break the flow
    }
}

// Middleware to verify customer token
const verifyCustomerToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.customerId = decoded.customerId;
        req.customerEmail = decoded.email;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check enterprise admin role
const isEnterpriseAdmin = async (req, res, next) => {
    try {
        const customer = await models.Customer.findById(req.customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        if (customer.enterprise_role !== 'admin') {
            return res.status(403).json({ error: 'Enterprise admin access required' });
        }
        req.customer = customer;
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Failed to verify admin status' });
    }
};

// GET /api/enterprise/license - Get enterprise license info
router.get('/license', verifyCustomerToken, isEnterpriseAdmin, async (req, res) => {
    try {
        const license = await models.License.findById(req.customer.enterprise_id).lean();
        
        if (!license) {
            return res.status(404).json({ error: 'Enterprise license not found' });
        }

        res.json({
            success: true,
            license: {
                license_key: license.license_key,
                seats: license.seats,
                seats_used: license.seats_used,
                status: license.status,
                expires_at: license.expires_at,
                team_members: license.team_members || []
            }
        });
    } catch (err) {
        console.error('Get enterprise license error:', err);
        res.status(500).json({ error: 'Failed to get license info' });
    }
});

// POST /api/enterprise/team/add - Add team member
router.post('/team/add', verifyCustomerToken, isEnterpriseAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const license = await models.License.findById(req.customer.enterprise_id);
        
        if (!license) {
            return res.status(404).json({ error: 'Enterprise license not found' });
        }

        // Check if seats available
        if (license.seats_used >= license.seats) {
            return res.status(400).json({ error: 'No seats available' });
        }

        // Check if already a team member
        const existingMember = license.team_members.find(m => m.email === email.toLowerCase());
        if (existingMember) {
            return res.status(400).json({ error: 'Email already in team' });
        }

        // Add team member
        license.team_members.push({
            email: email.toLowerCase(),
            status: 'pending',
            added_at: new Date()
        });
        license.seats_used = license.team_members.length;

        await license.save();

        // Send invitation email
        await sendInvitationEmail(email, req.customer.name, license.seats);

        res.json({
            success: true,
            license: {
                license_key: license.license_key,
                seats: license.seats,
                seats_used: license.seats_used,
                status: license.status,
                expires_at: license.expires_at,
                team_members: license.team_members
            }
        });

        console.log(`[Enterprise] Team invite: ${email} to license ${license.license_key}`);

    } catch (err) {
        console.error('Add team member error:', err);
        res.status(500).json({ error: 'Failed to add team member' });
    }
});

// DELETE /api/enterprise/team/remove - Remove team member
router.delete('/team/remove', verifyCustomerToken, isEnterpriseAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const license = await models.License.findById(req.customer.enterprise_id);
        
        if (!license) {
            return res.status(404).json({ error: 'Enterprise license not found' });
        }

        // Find and remove team member
        const memberIndex = license.team_members.findIndex(m => m.email === email.toLowerCase());
        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        license.team_members.splice(memberIndex, 1);
        license.seats_used = license.team_members.length;

        await license.save();

        // Update customer if they were linked to this enterprise
        await models.Customer.updateOne(
            { email: email.toLowerCase(), enterprise_id: license._id },
            { $set: { enterprise_id: null, enterprise_role: null, status: 'active' } }
        );

        res.json({
            success: true,
            license: {
                license_key: license.license_key,
                seats: license.seats,
                seats_used: license.seats_used,
                status: license.status,
                expires_at: license.expires_at,
                team_members: license.team_members
            }
        });

    } catch (err) {
        console.error('Remove team member error:', err);
        res.status(500).json({ error: 'Failed to remove team member' });
    }
});

// POST /api/enterprise/team/activate - Activate team member (called when member registers)
router.post('/team/activate', verifyCustomerToken, async (req, res) => {
    try {
        const customer = await models.Customer.findById(req.customerId);
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Check if customer email is in any enterprise team
        const license = await models.License.findOne({
            'team_members.email': customer.email.toLowerCase(),
            'team_members.status': 'pending'
        });

        if (!license) {
            return res.status(400).json({ error: 'No pending enterprise invitation found' });
        }

        // Update team member status to active
        const memberIndex = license.team_members.findIndex(
            m => m.email === customer.email.toLowerCase() && m.status === 'pending'
        );
        
        if (memberIndex !== -1) {
            license.team_members[memberIndex].status = 'active';
            license.team_members[memberIndex].activated_at = new Date();
            await license.save();
        }

        // Update customer with enterprise info
        customer.enterprise_id = license._id;
        customer.enterprise_role = 'member';
        customer.status = 'enterprise';
        await customer.save();

        res.json({
            success: true,
            message: 'Enterprise membership activated',
            license: {
                license_key: license.license_key,
                tier: license.tier
            }
        });

    } catch (err) {
        console.error('Activate team member error:', err);
        res.status(500).json({ error: 'Failed to activate membership' });
    }
});

module.exports = router;
