import { useParams } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { ChatWindow } from '../../components/chat/ChatWindow'

export function CustomerChatPage() {
  const { customerId } = useParams<{ customerId: string }>()
  
  // Get customer info from localStorage
  const customerData = localStorage.getItem('customer')
  const customer = customerData ? JSON.parse(customerData) : null
  
  const userId = customer?._id || customerId || 'anonymous'
  
  const {
    isConnected,
    messages,
    sendMessage,
    sendTyping,
    isUserTyping,
    error
  } = useSocket({
    userId,
    role: 'customer',
    customerId: userId
  })

  return (
    <div className="page customer-chat-page">
      <div className="page-header">
        <h1>Support Chat</h1>
        <p>Send payment receipts or ask questions</p>
      </div>
      
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      
      <div className="chat-container">
        <ChatWindow
          messages={messages}
          isConnected={isConnected}
          isUserTyping={isUserTyping}
          onSendMessage={sendMessage}
          onTyping={sendTyping}
          currentUserId={userId}
        />
      </div>
      
      <div className="chat-info">
        <h3>💡 Tips</h3>
        <ul>
          <li>Send payment receipt images for faster verification</li>
          <li>Include your order/reference number in messages</li>
          <li>Admin typically responds within 24 hours</li>
        </ul>
      </div>
    </div>
  )
}
