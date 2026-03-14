import { useState, useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { ChatWindow } from '../../components/chat/ChatWindow'

interface Customer {
  _id: string
  name: string
  email: string
  status: string
}

export function AdminChatPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Get admin info from localStorage
  const adminData = localStorage.getItem('admin')
  const admin = adminData ? JSON.parse(adminData) : null
  const adminId = admin?._id || 'admin'
  
  const {
    isConnected,
    messages,
    sendMessage,
    sendTyping,
    isUserTyping,
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
  }

  const handleSendMessage = (message: string, image?: string) => {
    if (!selectedCustomer) return
    sendMessage(message, image)
  }

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-sidebar">
        <h2>Customers</h2>
        {customers.length === 0 ? (
          <p className="no-customers">No active chats</p>
        ) : (
          <ul className="customer-list">
            {customers.map((customer) => (
              <li
                key={customer._id}
                className={`customer-item ${selectedCustomer?._id === customer._id ? 'selected' : ''}`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="customer-avatar">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="customer-info">
                  <span className="customer-name">{customer.name}</span>
                  <span className="customer-email">{customer.email}</span>
                </div>
                <span className={`status-badge ${customer.status}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="admin-chat-main">
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
              isUserTyping={isUserTyping}
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
