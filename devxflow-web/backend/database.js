const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devxflow', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

// License Schema
const licenseSchema = new mongoose.Schema({
    license_key: { type: String, required: true, unique: true },
    customer_email: { type: String },
    status: { type: String, default: 'active' },
    tier: { type: String, default: 'pro', enum: ['free', 'pro', 'pro_plus', 'teams', 'enterprise'] },
    max_activations: { type: Number, default: 3 },
    // Enterprise fields
    seats: { type: Number, default: 1 },
    seats_used: { type: Number, default: 0 },
    team_members: [{
        email: { type: String, required: true },
        status: { type: String, enum: ['pending', 'active'], default: 'pending' },
        added_at: { type: Date, default: Date.now },
        activated_at: { type: Date }
    }],
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date },
    revoked_at: { type: Date }
});

// Activation Schema
const activationSchema = new mongoose.Schema({
    license_id: { type: mongoose.Schema.Types.ObjectId, ref: 'License', required: true },
    device_id: { type: String, required: true },
    activated_at: { type: Date, default: Date.now },
    last_seen: { type: Date, default: Date.now }
});

// Validation Log Schema
const validationLogSchema = new mongoose.Schema({
    license_key: { type: String, required: true },
    device_id: { type: String },
    ip_address: { type: String },
    result: { type: String, required: true },
    message: { type: String },
    validated_at: { type: Date, default: Date.now }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
    payment_intent_id: { type: String, unique: true, sparse: true },
    customer_email: { type: String, required: true },
    customer_name: { type: String, required: true },
    amount: { type: Number, required: true },
    plan: { type: String, required: true, enum: ['basic', 'professional'] },
    status: { 
        type: String, 
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending' 
    },
    gcash_reference: { type: String },
    proof_image_url: { type: String },
    reference_number: { type: String },
    created_at: { type: Date, default: Date.now },
    paid_at: { type: Date },
    verified_at: { type: Date },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    license_key: { type: String }
});

// Message Schema
const messageSchema = new mongoose.Schema({
    customer_name: { type: String, required: true },
    customer_email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'unread' },
    created_at: { type: Date, default: Date.now },
    replied_at: { type: Date },
    admin_reply: { type: String }
});

// Trial Schema
const trialSchema = new mongoose.Schema({
    email: { type: String, required: true },
    device_fingerprint: { type: String, required: true },
    device_info: { type: String },
    trial_ends_at: { type: Date, required: true },
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now },
    last_validated_at: { type: Date }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, default: 'active', enum: ['active', 'trial', 'enterprise'] },
    // Enterprise fields
    enterprise_id: { type: mongoose.Schema.Types.ObjectId, ref: 'License' },
    enterprise_role: { type: String, enum: ['admin', 'member'], default: null },
    api_keys: {
        openai: { key: String, added_at: Date },
        anthropic: { key: String, added_at: Date },
        google: { key: String, added_at: Date },
        deepseek: { key: String, added_at: Date },
        mistral: { key: String, added_at: Date },
        openrouter: { key: String, added_at: Date }
    },
    license_id: { type: mongoose.Schema.Types.ObjectId, ref: 'License' },
    trial_started_at: { type: Date },
    trial_expires_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    last_login: { type: Date }
});

// Create compound index for trial uniqueness
trialSchema.index({ email: 1, device_fingerprint: 1 }, { unique: true });
activationSchema.index({ license_id: 1, device_id: 1 }, { unique: true });

// Create models
const Admin = mongoose.model('Admin', adminSchema);
const License = mongoose.model('License', licenseSchema);
const Activation = mongoose.model('Activation', activationSchema);
const ValidationLog = mongoose.model('ValidationLog', validationLogSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Message = mongoose.model('Message', messageSchema);
const Trial = mongoose.model('Trial', trialSchema);
const Customer = mongoose.model('Customer', customerSchema);

// Database helpers (backward compatible with SQLite API)
const dbHelpers = {
    connectDB,
    getDb: () => mongoose.connection,

    // Run query with promise (Mongoose style)
    run: async (model, operation, data) => {
        try {
            const result = await model[operation](data);
            return { id: result._id, changes: 1 };
        } catch (err) {
            throw err;
        }
    },

    // Get single document
    get: async (model, filter = {}) => {
        try {
            return await model.findOne(filter).lean();
        } catch (err) {
            throw err;
        }
    },

    // Get all documents
    all: async (model, filter = {}) => {
        try {
            return await model.find(filter).lean();
        } catch (err) {
            throw err;
        }
    },

    // Models for direct access
    models: {
        Admin,
        License,
        Activation,
        ValidationLog,
        Payment,
        Message,
        Trial,
        Customer
    }
};

module.exports = dbHelpers;
