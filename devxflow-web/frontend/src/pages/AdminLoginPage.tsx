import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token and redirect
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('admin', JSON.stringify(data.admin))
      
      console.log('Admin login successful:', data)
      navigate('/admin')
      
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header">
          <h1>Admin Login</h1>
          <p>Sign in to access admin panel</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {isLoading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Signing in...</p>
          </div>
        )}
        
        <div className="back-link">
          <Link to="/">← Back to Home</Link>
        </div>
      </div>

      <style>{`
        .login-page {
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          background: #0a0a0f;
          color: var(--text-primary);
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1;
        }
        
        .login-container {
          max-width: 450px;
          width: 100%;
          background: var(--bg-secondary);
          padding: 50px;
          border-radius: 16px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #8b5cf6;
        }
        
        .header p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .form-group {
          margin-bottom: 25px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .form-group input {
          width: 100%;
          padding: 15px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        
        .form-group input::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
        }
        
        .btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
        }
        
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
        }
        
        .btn:disabled {
          background: #333;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .back-link {
          text-align: center;
          margin-top: 20px;
        }
        
        .back-link a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s;
        }
        
        .back-link a:hover {
          color: #8b5cf6;
        }
        
        .error-message {
          background: rgba(255, 95, 86, 0.1);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .loading {
          text-align: center;
          margin-top: 20px;
          color: var(--text-secondary);
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--text-secondary);
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
