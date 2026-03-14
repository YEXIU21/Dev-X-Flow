require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const licenseRoutes = require('./routes/licenses');
const validationRoutes = require('./routes/validation');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const messageRoutes = require('./routes/messages');
const trialRoutes = require('./routes/trials');
const customerRoutes = require('./routes/customers');
const aiConfigRoutes = require('./routes/aiConfig');
const customerApiKeysRoutes = require('./routes/customerApiKeys');
const customerLicenseRoutes = require('./routes/customerLicense');
const enterpriseRoutes = require('./routes/enterprise');

// Import socket handlers
const { initChatHandlers } = require('./socket/chat');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize chat handlers
initChatHandlers(io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for showcase website
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/validate', validationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin/ai-config', aiConfigRoutes);
app.use('/api/customer/api-keys', customerApiKeysRoutes);
app.use('/api/customer/license', customerLicenseRoutes);
app.use('/api/enterprise', enterpriseRoutes);

// Admin dashboard route - redirect to frontend dev server in development
app.get('/admin', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
    } else {
        res.redirect('http://localhost:5173/admin');
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Dev-X-Flow Licensing Server`);
    console.log(`================================`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io enabled for real-time chat`);
    console.log(`API endpoints:`);
    console.log(`  - POST /api/auth/login (Admin login)`);
    console.log(`  - POST /api/validate (License validation)`);
    console.log(`  - GET  /api/licenses (List licenses - admin)`);
    console.log(`  - POST /api/licenses/generate (Generate license - admin)`);
    console.log(`  - POST /api/payment/create-intent (GCash payment)`);
    console.log(`  - POST /api/payment/webhook (Payment webhook)`);
    console.log(`  - POST /api/messages/submit (Contact form)`);
    console.log(`  - GET  /api/messages (View messages - admin)`);
    console.log(`  - POST /api/trials/start (Start trial)`);
    console.log(`  - POST /api/trials/validate (Validate trial)`);
    console.log(`  - POST /api/customers/register (Customer signup)`);
    console.log(`  - POST /api/customers/login (Customer login)`);
    console.log(`  - GET  /api/customers/profile (Customer profile)`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`================================`);
});

module.exports = app;
