import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const PHRASES = [
  'AI-powered commit generation',
  'Real-time debugging tools',
  'Visual Git operations',
  'Database management',
  'One-click deployment',
]

export function HeroSection() {
  const [typingText, setTypingText] = useState('')
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'pauseAfterType' | 'deleting' | 'pauseAfterDelete'>('typing')

  useEffect(() => {
    const fullText = PHRASES[currentPhraseIndex]
    const typeSpeedMs = 100
    const deleteSpeedMs = 50
    const pauseAfterTypeMs = 2000
    const pauseAfterDeleteMs = 500

    const delayMs = (() => {
      switch (phase) {
        case 'typing':
          return typeSpeedMs
        case 'deleting':
          return deleteSpeedMs
        case 'pauseAfterType':
          return pauseAfterTypeMs
        case 'pauseAfterDelete':
          return pauseAfterDeleteMs
      }
    })()

    const timeoutId = setTimeout(() => {
      if (phase === 'typing') {
        const next = fullText.slice(0, typingText.length + 1)
        setTypingText(next)
        if (next.length === fullText.length) setPhase('pauseAfterType')
        return
      }

      if (phase === 'pauseAfterType') {
        setPhase('deleting')
        return
      }

      if (phase === 'deleting') {
        const next = typingText.slice(0, Math.max(0, typingText.length - 1))
        setTypingText(next)
        if (next.length === 0) setPhase('pauseAfterDelete')
        return
      }

      // pauseAfterDelete
      setCurrentPhraseIndex((idx) => (idx + 1) % PHRASES.length)
      setPhase('typing')
    }, delayMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [currentPhraseIndex, phase, typingText])

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
            <div className="terminal-title">Dev-X-Flow --version</div>
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
