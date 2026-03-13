import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Navbar } from '../../components/common/Navbar'
import { User, Key, Shield, Settings as SettingsIcon, Plus, Trash2, Check, X, Eye, EyeOff } from 'lucide-react'

const API_BASE = 'http://localhost:5000/api'

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google (Gemini)', placeholder: 'AIza...' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'mistral', name: 'Mistral', placeholder: 'sk-...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' }
]

export function SettingsPage() {
  const { customer, token, updateCustomer } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [apiKeys, setApiKeys] = useState<Record<string, { masked: string; has_key: boolean; added_at?: string }>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  })

  // API key modal
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [testingKey, setTestingKey] = useState(false)

  useEffect(() => {
    if (customer) {
      setProfileForm({
        name: customer.name || '',
        email: customer.email || ''
      })
    }
    loadApiKeys()
  }, [customer])

  const loadApiKeys = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/customer/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setApiKeys(data.api_keys)
      }
    } catch (e) {
      console.error('Failed to load API keys:', e)
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch(`${API_BASE}/customers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      })
      
      const data = await res.json()
      if (data.success) {
        updateCustomer(data.customer)
        setSuccess('Profile updated successfully')
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const openAddKeyModal = (providerId: string) => {
    setSelectedProvider(providerId)
    setNewKey('')
    setShowKeyModal(true)
  }

  const handleSaveKey = async () => {
    if (!selectedProvider || !newKey.trim()) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const res = await fetch(`${API_BASE}/customer/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ provider: selectedProvider, key: newKey.trim() })
      })
      
      const data = await res.json()
      if (data.success) {
        loadApiKeys()
        setShowKeyModal(false)
        setSuccess(`${selectedProvider} API key saved`)
      } else {
        setError(data.error || 'Failed to save key')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestKey = async () => {
    if (!selectedProvider || !newKey.trim()) return
    
    setTestingKey(true)
    setError('')
    
    try {
      const res = await fetch(`${API_BASE}/customer/api-keys/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ provider: selectedProvider, key: newKey.trim() })
      })
      
      const data = await res.json()
      if (data.valid) {
        setSuccess(`✓ ${selectedProvider} API key is valid`)
      } else {
        setError(data.error || 'Invalid API key')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setTestingKey(false)
    }
  }

  const handleRemoveKey = async (providerId: string) => {
    if (!confirm(`Remove ${providerId} API key?`)) return
    
    try {
      const res = await fetch(`${API_BASE}/customer/api-keys/${providerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await res.json()
      if (data.success) {
        loadApiKeys()
        setSuccess(`${providerId} API key removed`)
      }
    } catch (e) {
      setError('Failed to remove key')
    }
  }

  return (
    <div className="settings-page">
      <Navbar />

      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={18} /> Profile
          </button>
          <button className={`tab-btn ${activeTab === 'api-keys' ? 'active' : ''}`} onClick={() => setActiveTab('api-keys')}>
            <Key size={18} /> API Keys
          </button>
          <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={18} /> Security
          </button>
          <button className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
            <SettingsIcon size={18} /> Preferences
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h2>Profile Information</h2>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <button className="btn-primary" onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="api-keys-section">
              <h2>Your API Keys</h2>
              <p className="section-desc">Add your own API keys to use with AI features. Keys are stored securely and masked in the UI.</p>
              
              <div className="api-keys-list">
                {PROVIDERS.map(provider => {
                  const keyInfo = apiKeys[provider.id]
                  return (
                    <div key={provider.id} className="api-key-item">
                      <div className="provider-info">
                        <span className="provider-name">{provider.name}</span>
                        {keyInfo?.has_key ? (
                          <span className="key-status has-key">
                            {keyInfo.masked}
                            <small>Added {keyInfo.added_at ? new Date(keyInfo.added_at).toLocaleDateString() : ''}</small>
                          </span>
                        ) : (
                          <span className="key-status no-key">Not configured</span>
                        )}
                      </div>
                      <div className="key-actions">
                        {keyInfo?.has_key ? (
                          <>
                            <button className="btn-small" onClick={() => openAddKeyModal(provider.id)}>Update</button>
                            <button className="btn-small btn-danger" onClick={() => handleRemoveKey(provider.id)}>Remove</button>
                          </>
                        ) : (
                          <button className="btn-small" onClick={() => openAddKeyModal(provider.id)}>Add Key</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="security-section">
              <h2>Security</h2>
              <div className="security-option">
                <h3>Change Password</h3>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" placeholder="••••••••" />
                </div>
                <button className="btn-primary">Update Password</button>
              </div>
              
              <div className="security-option">
                <h3>Two-Factor Authentication</h3>
                <p>Add an extra layer of security to your account.</p>
                <button className="btn-secondary">Enable 2FA</button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="preferences-section">
              <h2>Preferences</h2>
              <div className="form-group">
                <label htmlFor="ai-provider">Default AI Provider</label>
                <select id="ai-provider" aria-label="Default AI Provider">
                  <option>OpenAI GPT-4</option>
                  <option>Claude 3.5</option>
                  <option>Google Gemini</option>
                  <option>DeepSeek</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="theme">Theme</label>
                <select id="theme" aria-label="Theme">
                  <option>Dark</option>
                  <option>Light</option>
                  <option>System</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email Notifications</label>
                <label className="toggle">
                  <input type="checkbox" defaultChecked aria-label="Email Notifications" />
                  <span className="slider"></span>
                </label>
              </div>
              <button className="btn-primary">Save Preferences</button>
            </div>
          )}
        </div>
      </div>

      {/* Add API Key Modal */}
      {showKeyModal && selectedProvider && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add {PROVIDERS.find(p => p.id === selectedProvider)?.name} Key</h2>
            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowKeyModal(false)}>Cancel</button>
              <button className="btn-secondary" onClick={handleTestKey} disabled={testingKey}>
                {testingKey ? 'Testing...' : 'Test Key'}
              </button>
              <button className="btn-primary" onClick={handleSaveKey} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
