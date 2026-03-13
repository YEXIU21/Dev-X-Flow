import React, { useState, useEffect } from 'react'

interface LicenseModalProps {
  isOpen: boolean
  onClose: () => void
  onActivate: (licenseKey: string) => Promise<{ valid: boolean; tier?: string; expires_at?: string | null; features?: string[]; error?: string }>
  onLogin?: () => Promise<{ success: boolean }>
  onStartTrial?: () => Promise<{ success: boolean; trial?: { active: boolean; expires_at: string; days_remaining: number }; error?: string }>
  initialMode?: 'welcome' | 'input' | 'trial'
}

interface LicenseStatus {
  valid: boolean
  error?: string
  license?: {
    key: string
    status: string
    customer_email: string
    expires_at: string | null
    max_activations: number
    current_activations: number
    device_id: string
    tier: 'free' | 'pro' | 'pro_plus' | 'teams'
    features: string[]
  }
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  onActivate,
  onLogin,
  onStartTrial,
  initialMode = 'welcome'
}) => {
  const [mode, setMode] = useState<'welcome' | 'input' | 'trial' | 'status' | 'login'>(initialMode)
  const [licenseKey, setLicenseKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [error, setError] = useState('')
  const [trialInfo, setTrialInfo] = useState<{ active: boolean; expires_at: string; days_remaining: number } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setLicenseKey('')
      setError('')
      setStatus(null)
      setTrialInfo(null)
    }
  }, [isOpen, initialMode])

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await onActivate(licenseKey)
      setMode('status')
    } catch (err) {
      setError('Activation failed. Please check your license key and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTrial = async () => {
    // If onStartTrial provided, call API; otherwise just show trial UI
    if (onStartTrial) {
      setIsLoading(true)
      setError('')
      try {
        const result = await onStartTrial()
        if (result.success && result.trial) {
          setTrialInfo(result.trial)
          setMode('trial')
        } else {
          setError(result.error || 'Failed to start trial')
        }
      } catch (err) {
        setError('Failed to start trial')
      } finally {
        setIsLoading(false)
      }
    } else {
      setMode('trial')
    }
  }

  const handleLogin = async () => {
    if (onLogin) {
      setIsLoading(true)
      try {
        await onLogin()
        // Login opens browser - show waiting state
        setMode('login')
      } catch (err) {
        setError('Failed to open login')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleBuyLicense = () => {
    // Open pricing page in browser
    window.open('https://devxflow.com/pricing', '_blank')
  }

  const formatKey = (value: string) => {
    // Format as XXXX-XXXX-XXXX-XXXX
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.slice(0, 4).join('-')
  }

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKey(e.target.value)
    setLicenseKey(formatted)
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="license-modal-overlay" onClick={onClose}>
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        {mode === 'welcome' && (
          <div className="license-welcome">
            <h2>Welcome to Dev-X-Flow</h2>
            <p className="license-subtitle">
              Powerful Git management tools for modern developers
            </p>

            <div className="license-options">
              <button
                className="license-btn license-btn-primary"
                onClick={handleStartTrial}
                disabled={isLoading}
              >
                <span className="btn-icon">🚀</span>
                <span className="btn-text">
                  <strong>Start Free Trial</strong>
                  <small>30 days, limited features</small>
                </span>
              </button>

              <button
                className="license-btn license-btn-secondary"
                onClick={handleLogin}
                disabled={isLoading}
              >
                <span className="btn-icon">🔐</span>
                <span className="btn-text">
                  <strong>Login to Account</strong>
                  <small>Activate your license</small>
                </span>
              </button>

              <button
                className="license-btn license-btn-secondary"
                onClick={() => setMode('input')}
              >
                <span className="btn-icon">🔑</span>
                <span className="btn-text">
                  <strong>Enter License Key</strong>
                  <small>Already have a license?</small>
                </span>
              </button>

              <button
                className="license-btn license-btn-outline"
                onClick={handleBuyLicense}
              >
                <span className="btn-icon">💎</span>
                <span className="btn-text">
                  <strong>Buy License</strong>
                  <small>From ₱399/year</small>
                </span>
              </button>
            </div>

            {error && <p className="license-error">{error}</p>}

            <div className="license-features-preview">
              <h4>Free Trial Includes:</h4>
              <ul>
                <li>✅ Basic Git operations (Status, Commit, History)</li>
                <li>✅ Terminal with command history</li>
                <li>✅ Remote repository management</li>
                <li>✅ Dark mode support</li>
                <li>❌ AI-powered commits</li>
                <li>❌ Database management</li>
                <li>❌ Merge resolver & rebase UI</li>
              </ul>
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div className="license-login-waiting">
            <h2>🔐 Logging in...</h2>
            <p className="license-subtitle">
              Complete login in your browser
            </p>
            <p className="login-hint">
              The browser will redirect back to Dev-X-Flow after login.
            </p>
            <button
              className="license-btn license-btn-outline"
              onClick={() => setMode('welcome')}
            >
              Cancel
            </button>
          </div>
        )}

        {mode === 'input' && (
          <div className="license-input">
            <button className="license-back" onClick={() => setMode('welcome')}>
              ← Back
            </button>

            <h2>Activate License</h2>
            <p className="license-subtitle">
              Enter your license key to unlock all features
            </p>

            <div className="license-key-input-wrapper">
              <input
                type="text"
                className="license-key-input"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={handleKeyChange}
                maxLength={19}
                disabled={isLoading}
              />
              {error && <span className="license-error">{error}</span>}
            </div>

            <button
              className="license-btn license-btn-primary license-btn-full"
              onClick={handleActivate}
              disabled={isLoading || licenseKey.length < 19}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Validating...
                </>
              ) : (
                'Activate License'
              )}
            </button>

            <p className="license-help">
              Don't have a license?{' '}
              <button className="link-btn" onClick={handleBuyLicense}>
                Buy now
              </button>
            </p>
          </div>
        )}

        {mode === 'trial' && (
          <div className="license-trial">
            <h2>🎉 Trial Started!</h2>
            <p className="license-subtitle">
              You now have 30 days to explore Dev-X-Flow
            </p>

            <div className="trial-info">
              <div className="trial-badge">30 days remaining</div>

              <div className="license-features-preview">
                <h4>Your Trial Includes:</h4>
                <ul>
                  <li>✅ Basic Git operations</li>
                  <li>✅ Terminal access</li>
                  <li>✅ Remote management</li>
                  <li>✅ Dark mode</li>
                </ul>

                <div className="upgrade-teaser">
                  <p>Unlock more with Pro:</p>
                  <ul className="locked-features">
                    <li>🔒 AI-powered commits</li>
                    <li>🔒 Database management</li>
                    <li>🔒 Diff viewer</li>
                    <li>🔒 Merge resolver</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              className="license-btn license-btn-primary license-btn-full"
              onClick={onClose}
            >
              Get Started
            </button>

            <button
              className="license-btn license-btn-outline license-btn-full"
              onClick={handleBuyLicense}
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {mode === 'status' && status?.license && (
          <div className="license-status">
            <h2>✅ License Active</h2>

            <div className="license-info-card">
              <div className="license-tier-badge">
                {status.license.tier.replace('_', ' ').toUpperCase()}
              </div>

              <div className="license-detail">
                <label>License Key</label>
                <span>{status.license.key}</span>
              </div>

              <div className="license-detail">
                <label>Status</label>
                <span className="status-active">{status.license.status}</span>
              </div>

              {status.license.expires_at && (
                <div className="license-detail">
                  <label>Expires</label>
                  <span>{new Date(status.license.expires_at).toLocaleDateString()}</span>
                </div>
              )}

              <div className="license-detail">
                <label>Devices</label>
                <span>
                  {status.license.current_activations} / {status.license.max_activations}
                </span>
              </div>
            </div>

            <button
              className="license-btn license-btn-primary license-btn-full"
              onClick={onClose}
            >
              Continue
            </button>
          </div>
        )}

        <button className="license-close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}

export default LicenseModal
