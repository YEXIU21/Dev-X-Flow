import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Navbar } from '../../components/common/Navbar'
import { Key, Monitor, Calendar, Check, X, Zap, CreditCard } from 'lucide-react'

const API_BASE = 'http://localhost:5000/api'

export function LicensePage() {
  const { token } = useAuth()
  const [license, setLicense] = useState<{
    key: string
    tier: string
    status: string
    expires_at: string | null
    max_activations: number
    current_activations: number
    features: string[]
  } | null>(null)
  const [devices, setDevices] = useState<Array<{
    id: string
    name: string
    activated_at: string
    last_seen: string
  }>>([])
  const [trial, setTrial] = useState<{
    started: boolean
    started_at: string
    expires_at: string
    days_remaining: number
  } | null>(null)
  const [hasLicense, setHasLicense] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [licenseKey, setLicenseKey] = useState('')
  const [deviceId] = useState(() => 
    navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  )
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadLicenseInfo()
  }, [token])

  const loadLicenseInfo = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/customer/license/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setHasLicense(data.has_license)
        if (data.has_license) {
          setLicense(data.license)
          setDevices(data.devices || [])
        } else {
          setTrial(data.trial)
        }
      }
    } catch (e) {
      console.error('Failed to load license info:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE}/customer/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          license_key: licenseKey.trim(),
          device_id: deviceId,
          device_name: 'Web Browser'
        })
      })

      const data = await res.json()
      if (data.success) {
        setHasLicense(true)
        setLicense(data.license)
        setDevices([data.device])
        setShowActivateModal(false)
        setLicenseKey('')
        setSuccess('License activated successfully!')
      } else {
        setError(data.error || 'Activation failed')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTrial = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/customer/license/trial/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (data.success) {
        setTrial({
          started: true,
          started_at: data.trial.started_at,
          expires_at: data.trial.expires_at,
          days_remaining: data.trial.days
        })
        setSuccess('Free trial started! Enjoy 14 days of Pro features.')
      } else {
        setError(data.error || 'Failed to start trial')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivateDevice = async (deviceId: string) => {
    if (!confirm('Deactivate this device? You can reactivate it later.')) return

    try {
      const res = await fetch(`${API_BASE}/customer/license/device/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDevices(devices.filter(d => d.id !== deviceId))
        setSuccess('Device deactivated')
      } else {
        setError(data.error || 'Failed to deactivate')
      }
    } catch (e) {
      setError('Connection failed')
    }
  }

  const getTierBadge = (tier: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      free: { label: 'Free', class: 'tier-free' },
      pro: { label: 'Pro', class: 'tier-pro' },
      'pro-plus': { label: 'Pro+', class: 'tier-pro-plus' },
      teams: { label: 'Teams', class: 'tier-teams' }
    }
    return badges[tier] || badges.free
  }

  return (
    <div className="license-page">
      <Navbar />

      <div className="license-container">
        <div className="license-header">
          <h1>License Management</h1>
          <p>Manage your license and view your subscription details</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {isLoading ? (
          <div className="loading-state">Loading license info...</div>
        ) : (
          <>
            {/* Current Plan */}
            <div className="current-plan">
              <h2>Current Plan</h2>
              {hasLicense && license ? (
                <div className="plan-card">
                  <div className={`tier-badge ${getTierBadge(license.tier).class}`}>
                    {getTierBadge(license.tier).label}
                  </div>
                  <div className="plan-details">
                    <div className="detail-row">
                      <span className="label"><Key size={14} /> License Key</span>
                      <span className="value masked">{license.key}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status</span>
                      <span className={`status ${license.status}`}>{license.status}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label"><Calendar size={14} /> Expires</span>
                      <span className="value">{license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label"><Monitor size={14} /> Devices</span>
                      <span className="value">{license.current_activations} / {license.max_activations}</span>
                    </div>
                  </div>
                  <div className="plan-features">
                    <h4>Included Features</h4>
                    <ul>
                      {license.features?.map((feature, i) => (
                        <li key={i}><Check size={14} /> {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : trial?.started ? (
                <div className="plan-card trial">
                  <div className="tier-badge tier-trial">Free Trial</div>
                  <div className="plan-details">
                    <div className="detail-row">
                      <span className="label">Days Remaining</span>
                      <span className="value trial-days">{trial.days_remaining}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label"><Calendar size={14} /> Expires</span>
                      <span className="value">{new Date(trial.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="trial-upgrade">
                    <p>Upgrade to keep all features after trial ends</p>
                    <Link to="/pricing" className="btn-primary">Upgrade Now</Link>
                  </div>
                </div>
              ) : (
                <div className="plan-card no-plan">
                  <div className="tier-badge tier-none">No Active Plan</div>
                  <p className="no-plan-desc">
                    Start a free trial or activate a license key to unlock all features.
                  </p>
                  <div className="no-plan-actions">
                    <button className="btn-primary" onClick={handleStartTrial}>
                      <Zap size={16} /> Start Free Trial
                    </button>
                    <button className="btn-secondary" onClick={() => setShowActivateModal(true)}>
                      <Key size={16} /> Activate License
                    </button>
                    <Link to="/#pricing" className="btn-secondary">
                      <CreditCard size={16} /> Buy License
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Devices */}
            {hasLicense && devices.length > 0 && (
              <div className="devices-section">
                <h2>Activated Devices</h2>
                <div className="devices-list">
                  {devices.map((device, i) => (
                    <div key={i} className="device-item">
                      <div className="device-info">
                        <span className="device-id">{device.name || device.id.substring(0, 8)}</span>
                        <span className="device-date">Activated: {new Date(device.activated_at).toLocaleDateString()}</span>
                      </div>
                      <button className="btn-small btn-danger" onClick={() => handleDeactivateDevice(device.id)}>
                        <X size={14} /> Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Billing History */}
            <div className="billing-section">
              <h2>Billing History</h2>
              <p className="no-records">No billing history available</p>
            </div>
          </>
        )}

        {/* Activate Modal */}
        {showActivateModal && (
          <div className="modal-overlay" onClick={() => setShowActivateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Activate License</h2>
              <div className="form-group">
                <label htmlFor="license-key">License Key</label>
                <input
                  id="license-key"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="license-key-input"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowActivateModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleActivate} disabled={isLoading}>
                  {isLoading ? 'Activating...' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
