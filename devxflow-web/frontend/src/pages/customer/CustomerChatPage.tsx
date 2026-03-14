import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { ChatWindow } from '../../components/chat/ChatWindow'

export function CustomerChatPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  
  // Get customer info from localStorage
  const customerData = localStorage.getItem('customer')
  const token = localStorage.getItem('token')
  const customer = customerData ? JSON.parse(customerData) : null
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token || !customer) {
      navigate('/login')
    }
  }, [token, customer, navigate])
  
  // Don't render if not authenticated
  if (!token || !customer) {
    return null
  }
  
  const userId = customer.id || customerId
  
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
    <div className="customer-chat-page">
      <div className="chat-widget">
        <div className="chat-widget-header">
          <div className="header-left">
            <h2>Support Chat</h2>
            <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          {isUserTyping && (
            <span className="typing-indicator">typing...</span>
          )}
        </div>
        
        {error && (
          <div className="chat-error">
            {error}
          </div>
        )}
        
        <div className="chat-widget-body">
          <ChatWindow
            messages={messages}
            isConnected={isConnected}
            onSendMessage={sendMessage}
            onTyping={sendTyping}
            currentUserId={userId}
          />
        </div>
      </div>

      <style>{`
        .customer-chat-page {
          min-height: 100dvh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .chat-widget {
          width: 100%;
          max-width: 400px;
          height: 600px;
          background: var(--bg-secondary, #12121a);
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .chat-widget-header {
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(0, 212, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .chat-widget-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #e0e0e0);
          margin: 0;
        }
        
        .status-badge {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        
        .status-badge.connected {
          background: rgba(0, 212, 255, 0.15);
          color: #00d4ff;
        }
        
        .status-badge.disconnected {
          background: rgba(255, 95, 86, 0.15);
          color: #ff5f56;
        }
        
        .typing-indicator {
          font-size: 12px;
          color: var(--text-secondary, #888);
          font-style: italic;
        }
        
        .chat-error {
          padding: 10px 20px;
          background: rgba(255, 95, 86, 0.1);
          color: #ff5f56;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 95, 86, 0.2);
        }
        
        .chat-widget-body {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        @media (max-width: 480px) {
          .customer-chat-page {
            padding: 0;
            align-items: stretch;
            justify-content: flex-start;
          }
          
          .chat-widget {
            max-width: 100%;
            height: 100dvh;
            border-radius: 0;
            border: none;
          }
          
          .chat-widget-header {
            padding: 14px 16px;
          }
          
          .chat-widget-header h2 {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  )
}
