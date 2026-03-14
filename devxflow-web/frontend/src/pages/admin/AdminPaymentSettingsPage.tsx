import { useState, useEffect } from 'react'

interface PaymentSettings {
  qr_image_url: string
  qr_public_id: string
  gcash_number: string
  gcash_account_name: string
  updated_at?: string
}

export function AdminPaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/payment/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.settings) {
        setSettings(data.settings)
        setQrPreview(data.settings.qr_image_url)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB')
        return
      }
      setQrFile(file)
      setQrPreview(URL.createObjectURL(file))
      setMessage('')
    }
  }

  const handleSave = async () => {
    if (!settings?.gcash_number && !qrFile) {
      setMessage('GCash number is required')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const token = localStorage.getItem('adminToken')
      const formData = new FormData()
      
      if (qrFile) {
        formData.append('qr_image', qrFile)
      }
      formData.append('gcash_number', settings?.gcash_number || '')
      formData.append('gcash_account_name', settings?.gcash_account_name || '')

      const res = await fetch('/api/payment/admin/settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      const data = await res.json()
      if (data.success) {
        setMessage('Payment settings saved successfully!')
        setSettings(data.settings)
        setQrFile(null)
      } else {
        setMessage(data.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Payment Settings</h1>

      {loading ? (
        <p className="text-[#94a3b8]">Loading settings...</p>
      ) : (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
            <h3 className="text-white font-semibold mb-2">💳 GCash Payment Configuration</h3>
            <ul className="text-[#94a3b8] text-sm space-y-1">
              <li>• Upload your GCash QR code image</li>
              <li>• Enter your GCash number for manual payments</li>
              <li>• Customers will see this QR code and number on the payment page</li>
              <li>• You can update these settings anytime</li>
            </ul>
          </div>

          {/* QR Code Upload */}
          <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
            <h2 className="text-xl font-semibold text-white mb-4">GCash QR Code</h2>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 bg-[#0f172a] border border-[#334155] rounded-lg flex items-center justify-center overflow-hidden">
                  {qrPreview ? (
                    <img 
                      src={qrPreview} 
                      alt="QR Code Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#94a3b8] text-sm">No QR uploaded</span>
                  )}
                </div>
              </div>

              {/* Upload */}
              <div className="flex-1">
                <label className="block text-[#94a3b8] text-sm mb-2">Upload New QR Code</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  title="Upload QR code image"
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#3b82f6] file:text-white file:cursor-pointer hover:file:bg-[#2563eb]"
                />
                <p className="text-[#94a3b8] text-xs mt-2">
                  Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>
              </div>
            </div>
          </div>

          {/* GCash Details */}
          <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
            <h2 className="text-xl font-semibold text-white mb-4">GCash Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#94a3b8] text-sm mb-1">GCash Number *</label>
                <input
                  type="text"
                  value={settings?.gcash_number || ''}
                  onChange={(e) => setSettings({ ...settings!, gcash_number: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[#94a3b8] text-sm mb-1">Account Name (Optional)</label>
                <input
                  type="text"
                  value={settings?.gcash_account_name || ''}
                  onChange={(e) => setSettings({ ...settings!, gcash_account_name: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {settings?.updated_at && (
            <div className="text-[#94a3b8] text-sm">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {message && (
              <span className={message.includes('success') ? 'text-green-400' : 'text-red-400'}>
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
