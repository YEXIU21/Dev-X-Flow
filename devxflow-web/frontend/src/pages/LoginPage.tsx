import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function LoginPage() {
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
      const response = await fetch('http://localhost:5000/api/customers/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token and redirect
      localStorage.setItem('token', data.token)
      localStorage.setItem('customer', JSON.stringify(data.customer))
      
      console.log('Login successful:', data)
      navigate('/dashboard')
      
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header">
          <h1>Welcome Back</h1>
          <p>Sign in to your customer account</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="you@example.com"
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
        
        <div className="links">
          <Link to="/register">Create Account</Link>
          <span>|</span>
          <Link to="/contact">Forgot Password?</Link>
        </div>
        
        <div className="back-link">
          <Link to="/">← Back to Home</Link>
        </div>
      </div>

      <style>{`
        .login-page {
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          background: #0a0a0f;
          color: var(--text-primary);
          min-height: 100dvh;
          width: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 100px 20px 40px;
          overflow-y: auto;
          position: relative;
        }
        
        .login-container {
          max-width: 450px;
          width: 100%;
          background: var(--bg-secondary);
          padding: 40px 30px;
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          margin-bottom: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 24px;
          margin-bottom: 8px;
          color: var(--accent);
        }
        
        .header p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .form-group input {
          width: 100%;
          padding: 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s;
          box-sizing: border-box;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        
        .form-group input::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
        }
        
        .btn {
          width: 100%;
          padding: 16px;
          background: var(--accent);
          color: var(--bg-primary);
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
          box-sizing: border-box;
        }
        
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px var(--accent-glow);
        }
        
        .btn:disabled {
          background: #333;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .links {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
        }
        
        .links a {
          color: var(--accent);
          text-decoration: none;
          transition: opacity 0.3s;
        }
        
        .links a:hover {
          opacity: 0.8;
        }
        
        .links span {
          color: var(--text-secondary);
          margin: 0 8px;
        }
        
        .back-link {
          text-align: center;
          margin-top: 16px;
        }
        
        .back-link a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s;
          font-size: 13px;
        }
        
        .back-link a:hover {
          color: var(--accent);
        }
        
        .error-message {
          background: rgba(255, 95, 86, 0.1);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
        }
        
        .loading {
          text-align: center;
          margin-top: 16px;
          color: var(--text-secondary);
          font-size: 13px;
        }
        
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--text-secondary);
          border-top: 2px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 8px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 480px) {
          .login-page {
            padding: 80px 16px 32px;
          }
          
          .login-container {
            padding: 30px 20px;
          }
          
          .header h1 {
            font-size: 22px;
          }
          
          .form-group {
            margin-bottom: 16px;
          }
          
          .form-group input {
            padding: 12px;
          }
          
          .btn {
            padding: 14px;
          }
        }
        
        @media (max-height: 600px) {
          .login-page {
            padding-top: 60px;
          }
          
          .login-container {
            padding: 24px 20px;
          }
          
          .header {
            margin-bottom: 20px;
          }
          
          .form-group {
            margin-bottom: 14px;
          }
        }
      `}</style>
    </div>
  )
}
