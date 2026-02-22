import { Link } from 'react-router-dom'
import { ChevronDown, User } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="nav">
      <Link
        to="/"
        className="logo"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        Dev-X-Flow
      </Link>
      <div className="nav-links">
        <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Home
        </Link>
        <Link to="/#features">Features</Link>
        <Link to="/#pricing">Pricing</Link>
        
        <div className="nav-dropdown">
          <button className="dropdown-trigger">
            More <ChevronDown size={14} />
          </button>
          <div className="dropdown-content">
            <Link to="/#showcase">Showcase</Link>
            <Link to="/changelog">Changelog</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>

        <Link to="/login" className="nav-profile" title="Login">
          <User />
        </Link>
        <Link to="/download" className="btn-buy">Download</Link>
      </div>
    </nav>
  )
}
