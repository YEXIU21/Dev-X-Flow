import { Link } from 'react-router-dom'
import { ChevronDown, Menu, User, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const closeMobile = () => {
    setMobileOpen(false)
    setMoreOpen(false)
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
      </div>
    </nav>
  )
}
