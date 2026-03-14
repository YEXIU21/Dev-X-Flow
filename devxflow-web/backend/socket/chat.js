/**
 * Socket.io Chat Handlers
 * Handles real-time chat communication between customers and admins
 */

const { uploadImage } = require('../utils/cloudinary');

// Store connected users
const connectedUsers = new Map(); // socket.id -> { userId, role, room }
const adminRoom = 'admin-room';

/**
 * Initialize Socket.io chat handlers
 * @param {Object} io - Socket.io server instance
 */
const initChatHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Customer/Admin joins their respective room
    socket.on('join', async (data) => {
      const { userId, role, customerId } = data;
      
      // Store user info
      connectedUsers.set(socket.id, { userId, role, customerId });
      
      if (role === 'admin') {
        // Admin joins admin room to receive all customer messages
        socket.join(adminRoom);
        console.log(`[Socket] Admin joined: ${userId}`);
      } else {
        // Customer joins their personal room
        const customerRoom = `customer-${customerId}`;
        socket.join(customerRoom);
        console.log(`[Socket] Customer joined: ${customerId}`);
        
        // Notify admin that customer is online
        io.to(adminRoom).emit('customer_online', { customerId });
      }
      
      socket.emit('joined', { success: true, role });
    });

    // Handle incoming chat message
    socket.on('send_message', async (data) => {
      const { customerId, message, image, senderId, senderName, senderRole } = data;
      
      try {
        let imageUrl = null;
        
        // If image is provided (base64), upload to Cloudinary
        if (image) {
          const uploadResult = await uploadImage(image);
          imageUrl = uploadResult.url;
        }
        
        const chatMessage = {
          id: Date.now().toString(),
          customerId,
          senderId,
          senderName,
          senderRole,
          message,
          imageUrl,
          timestamp: new Date().toISOString()
        };
        
        if (senderRole === 'customer') {
          // Customer sends to admin room
          io.to(adminRoom).emit('receive_message', chatMessage);
          // Also emit back to customer for confirmation
          const customerRoom = `customer-${customerId}`;
          io.to(customerRoom).emit('receive_message', chatMessage);
        } else {
          // Admin sends to specific customer
          const customerRoom = `customer-${customerId}`;
          io.to(customerRoom).emit('receive_message', chatMessage);
          // Also emit to admin room for other admins
          io.to(adminRoom).emit('receive_message', chatMessage);
        }
        
        // TODO: Save message to database
        
      } catch (error) {
        console.error('[Socket] Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { customerId, isTyping, senderRole } = data;
      
      if (senderRole === 'customer') {
        // Customer typing - notify admin room
        io.to(adminRoom).emit('user_typing', { customerId, isTyping });
      } else {
        // Admin typing - notify specific customer
        const customerRoom = `customer-${customerId}`;
        io.to(customerRoom).emit('user_typing', { isTyping });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        if (user.role === 'customer') {
          // Notify admin that customer went offline
          io.to(adminRoom).emit('customer_offline', { customerId: user.customerId });
        }
        connectedUsers.delete(socket.id);
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      }
    });
  });
};

module.exports = {
  initChatHandlers,
  adminRoom
};
