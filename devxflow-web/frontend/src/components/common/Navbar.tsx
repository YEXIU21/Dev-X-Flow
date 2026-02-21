import { Link } from 'react-router-dom'

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
        <Link to="/#showcase">Showcase</Link>
        <Link to="/#pricing">Pricing</Link>
        <Link to="/changelog">Changelog</Link>
        <Link to="/download">Download</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
        <Link to="/payment">Buy Now</Link>
      </div>
    </nav>
  )
}
