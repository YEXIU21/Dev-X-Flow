import { useState, useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { Menu, X, MessageSquare } from 'lucide-react'

interface Customer {
  _id: string
  name: string
  email: string
  status: string
}

export function AdminChatPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Get admin info from localStorage
  const adminData = localStorage.getItem('admin')
  const admin = adminData ? JSON.parse(adminData) : null
  const adminId = admin?._id || 'admin'
  
  const {
    isConnected,
    messages,
    sendMessage,
    sendTyping,
    error
  } = useSocket({
    userId: adminId,
    role: 'admin',
    customerId: selectedCustomer?._id
  })

  // Fetch customers with active chats
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('adminToken')
        const res = await fetch('http://localhost:5000/api/admin/customers', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setCustomers(data.customers || [])
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err)
      }
    }
    
    fetchCustomers()
  }, [])

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsSidebarOpen(false) // Close sidebar on mobile after selection
  }

  const handleSendMessage = (message: string, image?: string) => {
    if (!selectedCustomer) return
    sendMessage(message, image)
  }

  return (
    <div className="admin-chat-page">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <div className={`admin-chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Messages</h2>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)} title="Close sidebar">
            <X size={20} />
          </button>
        </div>
        {customers.length === 0 ? (
          <div className="no-customers">
            <MessageSquare size={32} className="no-chats-icon" />
            <p>No active chats</p>
          </div>
        ) : (
          <ul className="customer-list">
            {customers.map((customer) => (
              <li
                key={customer._id}
                className={`customer-item ${selectedCustomer?._id === customer._id ? 'selected' : ''}`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="customer-avatar">
                  {(customer.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="customer-info">
                  <span className="customer-name">{customer.name || 'Unknown'}</span>
                  <span className="customer-email">{customer.email || 'No email'}</span>
                </div>
                <span className={`status-badge ${customer.status || 'offline'}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Main Chat Area */}
      <div className="admin-chat-main">
        {/* Mobile Header */}
        <div className="chat-mobile-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)} title="Open menu">
            <Menu size={24} />
          </button>
          {selectedCustomer && (
            <div className="mobile-customer-info">
              <div className="customer-avatar-small">
                {(selectedCustomer.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span>{selectedCustomer.name || 'Unknown'}</span>
            </div>
          )}
        </div>
        
        {selectedCustomer ? (
          <>
            <div className="chat-header-info">
              <h3>{selectedCustomer.name}</h3>
              <span>{selectedCustomer.email}</span>
            </div>
            
            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}
            
            <ChatWindow
              messages={messages}
              isConnected={isConnected}
              onSendMessage={handleSendMessage}
              onTyping={sendTyping}
              currentUserId={adminId}
            />
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a customer to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}
