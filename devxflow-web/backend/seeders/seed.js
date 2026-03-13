const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devxflow');
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection error:', error);
        process.exit(1);
    }
};

// Schemas (simplified for seeding)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const customerSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    name: { type: String },
    created_at: { type: Date, default: Date.now },
    last_login: { type: Date }
});

const Admin = mongoose.model('Admin', adminSchema);
const Customer = mongoose.model('Customer', customerSchema);

// Seed data
const seedDatabase = async () => {
    try {
        // Clear existing data
        await Admin.deleteMany({});
        await Customer.deleteMany({});
        
        // Create admin account (with email format for login)
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        const admin = await Admin.create({
            username: 'admin',
            email: 'admin@gmail.com',
            password_hash: adminPasswordHash
        });
        console.log('✅ Admin created:', admin.email);
        
        // Create customer account
        const customerPasswordHash = await bcrypt.hash('customer123', 10);
        const customer = await Customer.create({
            email: 'customer@test.com',
            password_hash: customerPasswordHash,
            name: 'Test Customer'
        });
        console.log('✅ Customer created:', customer.email);
        
        console.log('\n=== SEED COMPLETE ===');
        console.log('Admin Login: admin@gmail.com / admin123');
        console.log('Customer Login: customer@test.com / customer123');
        
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

// Run
connectDB().then(seedDatabase);
