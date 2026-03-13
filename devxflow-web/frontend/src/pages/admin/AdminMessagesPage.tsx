import { useState, useEffect } from 'react'

interface Message {
  _id: string
  customer_name: string
  customer_email: string
  subject: string
  message: string
  status: string
  created_at: string
  admin_reply: string
}

export function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [reply, setReply] = useState('')

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:5000/api/messages', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setMessages(data.messages)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (messageId: string) => {
    if (!reply.trim()) return
    try {
      const token = localStorage.getItem('adminToken')
      await fetch(`http://localhost:5000/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reply })
      })
      setReply('')
      setSelectedMessage(null)
      fetchMessages()
    } catch (err) {
      console.error('Failed to send reply:', err)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Messages</h1>

      {loading ? (
        <p className="text-[#94a3b8]">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-[#94a3b8]">No messages yet.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg._id} className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-semibold">{msg.subject}</p>
                  <p className="text-[#94a3b8] text-sm">{msg.customer_name} ({msg.customer_email})</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  msg.status === 'unread' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {msg.status}
                </span>
              </div>
              <p className="text-[#94a3b8] mt-3">{msg.message}</p>
              <p className="text-[#94a3b8] text-xs mt-2">
                {new Date(msg.created_at).toLocaleString()}
              </p>
              
              {msg.admin_reply && (
                <div className="mt-3 p-3 bg-[#0f172a] rounded">
                  <p className="text-green-400 text-sm">Admin Reply:</p>
                  <p className="text-white text-sm">{msg.admin_reply}</p>
                </div>
              )}

              {!msg.admin_reply && (
                <button
                  onClick={() => setSelectedMessage(msg)}
                  className="mt-3 px-4 py-2 bg-[#3b82f6] text-white rounded hover:bg-[#2563eb]"
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] p-6 rounded-lg max-w-lg w-full">
            <h2 className="text-xl font-bold text-white mb-4">Reply to {selectedMessage.customer_name}</h2>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              className="w-full h-32 p-3 bg-[#0f172a] border border-[#334155] rounded text-white"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleReply(selectedMessage._id)}
                className="px-4 py-2 bg-[#3b82f6] text-white rounded hover:bg-[#2563eb]"
              >
                Send Reply
              </button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-[#334155] text-white rounded hover:bg-[#475569]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
