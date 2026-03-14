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
  onSendMessage: (message: string, image?: string) => void
  onTyping: (isTyping: boolean) => void
  currentUserId: string
}

export function ChatWindow({
  messages,
  isConnected,
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
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet</p>
            <small>Start the conversation!</small>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.senderId === currentUserId ? 'own' : 'other'}`}
            >
              {msg.imageUrl && (
                <div className="message-image">
                  <img src={msg.imageUrl} alt="Shared" />
                </div>
              )}
              {msg.message && (
                <p className="message-text">{msg.message}</p>
              )}
              <span className="message-time">{formatTime(msg.timestamp)}</span>
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
            <X size={14} />
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
          <ImageIcon size={18} />
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
            <Loader2 size={18} className="spinner" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      <style>{`
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-secondary, #12121a);
        }
        
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #888);
          text-align: center;
        }
        
        .chat-empty p {
          margin: 0;
          font-size: 14px;
        }
        
        .chat-empty small {
          font-size: 12px;
          opacity: 0.7;
        }
        
        .chat-message {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .chat-message.own {
          align-self: flex-end;
          background: var(--accent, #00d4ff);
          color: #000;
          border-bottom-right-radius: 4px;
        }
        
        .chat-message.other {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary, #e0e0e0);
          border-bottom-left-radius: 4px;
        }
        
        .message-text {
          margin: 0;
          word-wrap: break-word;
        }
        
        .message-image {
          margin-bottom: 6px;
        }
        
        .message-image img {
          max-width: 100%;
          border-radius: 8px;
        }
        
        .message-time {
          display: block;
          font-size: 10px;
          opacity: 0.6;
          margin-top: 4px;
          text-align: right;
        }
        
        .image-preview-container {
          position: relative;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.2);
        }
        
        .image-preview {
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
        }
        
        .remove-image-btn {
          position: absolute;
          top: 12px;
          right: 20px;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #fff;
        }
        
        .chat-input-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .file-input-hidden {
          display: none;
        }
        
        .attach-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary, #888);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .attach-btn:hover {
          color: var(--accent, #00d4ff);
          background: rgba(0, 212, 255, 0.1);
        }
        
        .chat-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 10px 16px;
          font-size: 14px;
          color: var(--text-primary, #e0e0e0);
          outline: none;
          transition: all 0.2s;
        }
        
        .chat-input:focus {
          border-color: var(--accent, #00d4ff);
        }
        
        .chat-input::placeholder {
          color: var(--text-secondary, #888);
        }
        
        .chat-input:disabled {
          opacity: 0.5;
        }
        
        .send-btn {
          background: var(--accent, #00d4ff);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #000;
          transition: all 0.2s;
        }
        
        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }
        
        .send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
