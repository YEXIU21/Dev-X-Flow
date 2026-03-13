import { Link } from 'react-router-dom'
import { ChevronDown, Menu, User, X, LogOut, Settings, Key } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { customer, isAuthenticated, logout } = useAuth()

  const closeMobile = () => {
    setMobileOpen(false)
    setMoreOpen(false)
    setProfileOpen(false)
  }

  const handleLogout = () => {
    logout()
    closeMobile()
  }

  return (
    <nav className="nav">
      <Link
        to="/"
        className="logo"
        onClick={() => {
          closeMobile()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      >
        Dev-X-Flow
      </Link>

      <button
        type="button"
        className="nav-toggle"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div
        className={`nav-links${mobileOpen ? ' is-open' : ''}`}
      >
        {isAuthenticated ? (
          // Authenticated navigation
          <>
            <Link to="/dashboard" onClick={closeMobile}>Dashboard</Link>
            <Link to="/license" onClick={closeMobile}>License</Link>
            
            <div className={`nav-dropdown${profileOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="dropdown-trigger profile-trigger"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <User size={18} />
                <span className="profile-name">{customer?.name?.split(' ')[0] || 'User'}</span>
                <ChevronDown size={14} />
              </button>
              <div className="dropdown-content profile-dropdown">
                <div className="profile-header">
                  <strong>{customer?.name}</strong>
                  <small>{customer?.email}</small>
                </div>
                <hr />
                <Link to="/dashboard" onClick={closeMobile}>
                  <User size={16} /> Dashboard
                </Link>
                <Link to="/license" onClick={closeMobile}>
                  <Key size={16} /> License
                </Link>
                <Link to="/settings" onClick={closeMobile}>
                  <Settings size={16} /> Settings
                </Link>
                <hr />
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </div>
          </>
        ) : (
          // Public navigation
          <>
            <Link
              to="/"
              onClick={() => {
                closeMobile()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              Home
            </Link>
            <Link to="/#features" onClick={closeMobile}>Features</Link>
            <Link to="/#pricing" onClick={closeMobile}>Pricing</Link>
            
            <div className={`nav-dropdown${moreOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More <ChevronDown size={14} />
              </button>
              <div className="dropdown-content">
                <Link to="/#showcase" onClick={closeMobile}>Showcase</Link>
                <Link to="/changelog" onClick={closeMobile}>Changelog</Link>
                <Link to="/contact" onClick={closeMobile}>Contact</Link>
              </div>
            </div>

            <Link to="/login" className="nav-profile" title="Login" onClick={closeMobile}>
              <User />
              <span className="nav-login-label">Log in</span>
            </Link>
            <Link to="/download" className="btn-buy" onClick={closeMobile}>
              Download
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
