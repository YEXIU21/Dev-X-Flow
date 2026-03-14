import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

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

interface UseSocketOptions {
  userId: string
  role: 'customer' | 'admin'
  customerId?: string
  serverUrl?: string
}

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  messages: ChatMessage[]
  sendMessage: (message: string, image?: string) => void
  sendTyping: (isTyping: boolean) => void
  isUserTyping: boolean
  error: string | null
}

export function useSocket({
  userId,
  role,
  customerId,
  serverUrl = 'http://localhost:5000'
}: UseSocketOptions): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isUserTyping, setIsUserTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id)
      setIsConnected(true)
      setError(null)
      
      // Join appropriate room
      newSocket.emit('join', {
        userId,
        role,
        customerId: customerId || userId
      })
    })

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err)
      setError('Failed to connect to chat server')
    })

    newSocket.on('joined', (data: { success: boolean; role: string }) => {
      console.log('[Socket] Joined room:', data)
    })

    newSocket.on('receive_message', (message: ChatMessage) => {
      console.log('[Socket] Received message:', message)
      setMessages((prev) => [...prev, message])
    })

    newSocket.on('user_typing', (data: { customerId?: string; isTyping: boolean }) => {
      setIsUserTyping(data.isTyping)
      
      // Clear typing indicator after 3 seconds
      if (data.isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsUserTyping(false)
        }, 3000)
      }
    })

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [serverUrl, userId, role, customerId])

  // Send message
  const sendMessage = useCallback(
    (message: string, image?: string) => {
      if (!socket || !isConnected) {
        setError('Not connected to chat server')
        return
      }

      socket.emit('send_message', {
        customerId: customerId || userId,
        message,
        image,
        senderId: userId,
        senderName: role === 'customer' ? 'You' : 'Admin',
        senderRole: role
      })
    },
    [socket, isConnected, customerId, userId, role]
  )

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !isConnected) return

      socket.emit('typing', {
        customerId: customerId || userId,
        isTyping,
        senderRole: role
      })
    },
    [socket, isConnected, customerId, userId, role]
  )

  return {
    socket,
    isConnected,
    messages,
    sendMessage,
    sendTyping,
    isUserTyping,
    error
  }
}
