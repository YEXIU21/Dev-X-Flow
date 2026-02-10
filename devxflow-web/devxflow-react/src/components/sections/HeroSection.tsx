import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export function HeroSection() {
  const [typingText, setTypingText] = useState('')
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  
  const phrases = [
    "AI-powered commit generation",
    "Real-time debugging tools", 
    "Visual Git operations",
    "Database management",
    "One-click deployment"
  ]

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex]
    let charIndex = 0
    
    const typeInterval = setInterval(() => {
      if (charIndex < currentPhrase.length) {
        setTypingText(currentPhrase.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typeInterval)
        setTimeout(() => {
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length)
          setTypingText('')
        }, 2000)
      }
    }, 100)

    return () => clearInterval(typeInterval)
  }, [currentPhraseIndex])

  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">v7.1.2 Available Now</div>
        <h1>
          <span className="glitch" data-text="Code.">Code.</span>
          <span className="highlight">Commit.</span>
          <span className="glitch" data-text="Ship.">Ship.</span>
        </h1>
        <div className="typing-text">{typingText}</div>
        
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
            <div className="terminal-title">devxflow-pro --version</div>
          </div>
          <div className="terminal-body">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> <span className="terminal-command">git add .</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> <span className="terminal-command">devxflow commit --ai</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-output">✨ AI analyzing changes...</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-output">📝 Generated: "feat(auth): implement JWT token validation"</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-output">✅ Commit created successfully!</span>
            </div>
          </div>
        </div>
        
        <div className="cta-buttons">
          <Link to="/register" className="btn btn-primary">
            Get Started Free
          </Link>
          <Link to="/#showcase" className="btn btn-secondary">
            See Demo
          </Link>
        </div>
      </div>
    </section>
  )
}
