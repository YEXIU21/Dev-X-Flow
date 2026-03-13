import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Customer {
  id: string
  email: string
  name: string
  status: string
  api_keys?: Record<string, { key: string; added_at: string }>
  license?: {
    key: string
    tier: string
    status: string
    expires_at: string | null
  }
  trial?: {
    active: boolean
    expires_at: string
    days_remaining: number
  }
}

interface AuthContextType {
  customer: Customer | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateCustomer: (updates: Partial<Customer>) => void
  refreshCustomer: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = 'http://localhost:5000/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('token')
    const storedCustomer = localStorage.getItem('customer')
    
    if (storedToken && storedCustomer) {
      setToken(storedToken)
      try {
        setCustomer(JSON.parse(storedCustomer))
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('customer')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/customers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('customer', JSON.stringify(data.customer))
      setToken(data.token)
      setCustomer(data.customer)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Connection failed' }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      // Auto login after registration
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('customer', JSON.stringify(data.customer))
        setToken(data.token)
        setCustomer(data.customer)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Connection failed' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('customer')
    setToken(null)
    setCustomer(null)
  }

  const updateCustomer = (updates: Partial<Customer>) => {
    if (customer) {
      const updated = { ...customer, ...updates }
      setCustomer(updated)
      localStorage.setItem('customer', JSON.stringify(updated))
    }
  }

  const refreshCustomer = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/customers/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        localStorage.setItem('customer', JSON.stringify(data.customer))
      } else if (response.status === 401) {
        logout()
      }
    } catch (error) {
      console.error('Failed to refresh customer:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      customer,
      token,
      isAuthenticated: !!token && !!customer,
      isLoading,
      login,
      register,
      logout,
      updateCustomer,
      refreshCustomer
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
