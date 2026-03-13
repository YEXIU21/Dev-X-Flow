import { useState, useEffect } from 'react'

interface AIConfig {
  // Multiple API keys for auto-fallback
  openaiKey: string
  anthropicKey: string
  googleKey: string
  mistralKey: string
  cohereKey: string
  xaiKey: string
  perplexityKey: string
  deepseekKey: string
  kimiKey: string
  qwenKey: string
  chatglmKey: string
  baichuanKey: string
  yiKey: string
  openrouterKey: string
  togetherKey: string
  groqKey: string
  fireworksKey: string
  ollamaUrl: string
  azureKey: string
  customKey: string
  customUrl: string
  // Fallback order
  fallbackOrder: string[]
}

const defaultConfig: AIConfig = {
  openaiKey: '',
  anthropicKey: '',
  googleKey: '',
  mistralKey: '',
  cohereKey: '',
  xaiKey: '',
  perplexityKey: '',
  deepseekKey: '',
  kimiKey: '',
  qwenKey: '',
  chatglmKey: '',
  baichuanKey: '',
  yiKey: '',
  openrouterKey: '',
  togetherKey: '',
  groqKey: '',
  fireworksKey: '',
  ollamaUrl: '',
  azureKey: '',
  customKey: '',
  customUrl: '',
  fallbackOrder: ['google', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere']
}

export function AdminSettingsPage() {
  const [config, setConfig] = useState<AIConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:5000/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.config) {
        setConfig({ ...defaultConfig, ...data.config })
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:5000/api/admin/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        setMessage('AI configuration saved successfully!')
      }
    } catch (err) {
      console.error('Failed to save config:', err)
      setMessage('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const updateKey = (field: keyof AIConfig, value: string) => {
    setConfig({ ...config, [field]: value })
  }

  const keyFields = [
    { field: 'googleKey', label: 'Google (Gemini)', placeholder: 'AIza...' },
    { field: 'openaiKey', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
    { field: 'anthropicKey', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
    { field: 'deepseekKey', label: 'DeepSeek (China)', placeholder: 'sk-...' },
    { field: 'mistralKey', label: 'Mistral AI', placeholder: '...' },
    { field: 'cohereKey', label: 'Cohere', placeholder: '...' },
    { field: 'xaiKey', label: 'xAI (Grok)', placeholder: '...' },
    { field: 'perplexityKey', label: 'Perplexity', placeholder: 'pplx-...' },
    { field: 'kimiKey', label: 'Kimi/Moonshot (China)', placeholder: 'sk-...' },
    { field: 'qwenKey', label: 'Qwen/Alibaba (China)', placeholder: 'sk-...' },
    { field: 'chatglmKey', label: 'ChatGLM/Zhipu (China)', placeholder: '...' },
    { field: 'baichuanKey', label: 'Baichuan (China)', placeholder: '...' },
    { field: 'yiKey', label: 'Yi/01.AI (China)', placeholder: '...' },
    { field: 'openrouterKey', label: 'OpenRouter (Multi-model)', placeholder: 'sk-or-...' },
    { field: 'togetherKey', label: 'Together AI', placeholder: '...' },
    { field: 'groqKey', label: 'Groq (Fast)', placeholder: 'gsk_...' },
    { field: 'fireworksKey', label: 'Fireworks AI', placeholder: '...' },
    { field: 'azureKey', label: 'Azure OpenAI', placeholder: 'endpoint|key' },
    { field: 'ollamaUrl', label: 'Ollama (Local)', placeholder: 'http://localhost:11434' },
    { field: 'customKey', label: 'Custom API Key', placeholder: '...' },
    { field: 'customUrl', label: 'Custom API URL', placeholder: 'https://api.example.com/v1' }
  ]

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">AI Configuration</h1>

      {loading ? (
        <p className="text-[#94a3b8]">Loading settings...</p>
      ) : (
        <div className="space-y-6">
          {/* How It Works */}
          <div className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
            <h3 className="text-white font-semibold mb-2">🔄 Auto-Fallback System</h3>
            <ul className="text-[#94a3b8] text-sm space-y-1">
              <li>• Paste API keys for any providers you have</li>
              <li>• System automatically tries each provider in order</li>
              <li>• If one hits quota limit, it switches to the next</li>
              <li>• Customers use your keys - no setup needed on their end</li>
            </ul>
          </div>

          {/* API Keys Grid */}
          <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
            <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>
            <p className="text-[#94a3b8] text-sm mb-4">
              Paste your API keys below. Only fill in the ones you have. The system will use them in order.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyFields.map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-[#94a3b8] text-sm mb-1">{label}</label>
                  <input
                    type="password"
                    value={config[field as keyof AIConfig] as string}
                    onChange={(e) => updateKey(field as keyof AIConfig, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fallback Order */}
          <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
            <h2 className="text-xl font-semibold text-white mb-4">Fallback Order</h2>
            <p className="text-[#94a3b8] text-sm mb-4">
              System tries providers in this order. Providers without API keys are skipped.
            </p>
            <div className="flex flex-wrap gap-2">
              {['google', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere', 'xai', 'perplexity', 'kimi', 'qwen', 'chatglm', 'openrouter', 'together', 'groq', 'fireworks', 'ollama', 'azure', 'custom'].map((provider, i) => (
                <span key={provider} className="px-3 py-1 bg-[#0f172a] border border-[#334155] rounded text-[#94a3b8] text-sm">
                  {i + 1}. {provider}
                </span>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
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
