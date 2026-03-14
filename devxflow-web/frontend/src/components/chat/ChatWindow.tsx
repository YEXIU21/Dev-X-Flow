import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react'

interface ChatMessage {
  id: string
  customerId: string
  senderId: string
  senderName: string
  senderRole: 'customer' | 'admin'
  message: string
  imageUrl?: string
  timestamp: string
}

interface ChatWindowProps {
  messages: ChatMessage[]
  isConnected: boolean
  isUserTyping: boolean
  onSendMessage: (message: string, image?: string) => void
  onTyping: (isTyping: boolean) => void
  currentUserId: string
}

export function ChatWindow({
  messages,
  isConnected,
  isUserTyping,
  onSendMessage,
  onTyping,
  currentUserId
}: ChatWindowProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (!inputMessage.trim() && !selectedImage) return
    
    setIsUploading(true)
    onSendMessage(inputMessage.trim(), selectedImage || undefined)
    
    setInputMessage('')
    setSelectedImage(null)
    setImagePreview(null)
    setIsUploading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)
    onTyping(e.target.value.length > 0)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setSelectedImage(base64)
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {isUserTyping && (
          <span className="typing-indicator">Someone is typing...</span>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.senderId === currentUserId ? 'own' : 'other'}`}
            >
              <div className="message-header">
                <span className="sender-name">{msg.senderName}</span>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
              {msg.imageUrl && (
                <div className="message-image">
                  <img src={msg.imageUrl} alt="Shared" />
                </div>
              )}
              {msg.message && (
                <p className="message-text">{msg.message}</p>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button onClick={removeImage} className="remove-image-btn" title="Remove image" aria-label="Remove image">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-container">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="file-input-hidden"
          aria-label="Upload image"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="attach-btn"
          title="Attach image"
          aria-label="Attach image"
        >
          <ImageIcon size={20} />
        </button>
        
        <input
          type="text"
          value={inputMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="chat-input"
          disabled={!isConnected || isUploading}
        />
        
        <button
          onClick={handleSendMessage}
          disabled={(!inputMessage.trim() && !selectedImage) || !isConnected || isUploading}
          className="send-btn"
        >
          {isUploading ? (
            <Loader2 size={20} className="spinner" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  )
}
