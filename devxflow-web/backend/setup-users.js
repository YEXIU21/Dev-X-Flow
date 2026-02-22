require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { models } = require('./database');

async function setupUsers() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully');

        // 1. Create Admin Account
        const adminUsername = 'devXflow_admin';
        const adminPassword = 'admin_password_2026'; // Change this in production
        
        let admin = await models.Admin.findOne({ username: adminUsername });
        if (!admin) {
            const password_hash = await bcrypt.hash(adminPassword, 10);
            admin = new models.Admin({ 
                username: adminUsername, 
                password_hash 
            });
            await admin.save();
            console.log(`✅ Admin account created: ${adminUsername} / ${adminPassword}`);
        } else {
            console.log(`ℹ️ Admin account already exists: ${adminUsername}`);
        }

        // 2. Create Standard User Account
        const userEmail = 'user@devxflow.com';
        const userPassword = 'user_password_2026'; // Change this in production
        
        let customer = await models.Customer.findOne({ email: userEmail });
        if (!customer) {
            const password_hash = await bcrypt.hash(userPassword, 10);
            customer = new models.Customer({ 
                email: userEmail, 
                password_hash,
                name: 'Test User', // Fixed field name from full_name to name
                status: 'active'
            });
            await customer.save();
            console.log(`✅ User account created: ${userEmail} / ${userPassword}`);
        } else {
            console.log(`ℹ️ User account already exists: ${userEmail}`);
        }

        console.log('\nUser setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupUsers();
