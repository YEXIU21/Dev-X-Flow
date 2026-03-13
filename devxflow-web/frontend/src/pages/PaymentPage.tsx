import { useState, useEffect } from 'react'
import { Navbar } from '../components/common/Navbar'

export function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [qrUrl, setQrUrl] = useState('')
  const [gcashNumber, setGcashNumber] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gcashRef: ''
  })
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [paymentId, setPaymentId] = useState('')
  const [error, setError] = useState('')

  const plans = [
    {
      id: 'basic',
      name: '1 Year',
      price: '₱399',
      amount: 399,
      description: 'Annual license',
      features: [
        'All features included',
        'Up to 3 devices',
        '1 year of updates',
        'Email support',
        'Pay via GCash'
      ]
    },
    {
      id: 'professional',
      name: '3 Years',
      price: '₱899',
      amount: 899,
      description: 'Save 25% over 1-year plan',
      featured: true,
      features: [
        'All features included',
        'Up to 5 devices',
        '3 years of updates',
        'Priority email support',
        'Pay via GCash'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      description: 'Tailored for large teams',
      features: [
        'All features included',
        'Unlimited devices',
        'Dedicated support',
        'Custom integrations',
        'On-premise options'
      ]
    }
  ]

  // Fetch QR code on mount
  useEffect(() => {
    const fetchQR = async () => {
      try {
        const res = await fetch('/api/payment/qr')
        const data = await res.json()
        if (data.success) {
          setQrUrl(data.qr_url)
          setGcashNumber(data.gcash_number)
        }
      } catch (err) {
        console.error('Failed to fetch QR:', err)
      }
    }
    fetchQR()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      setScreenshot(file)
      setScreenshotPreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!screenshot) {
      setError('Please upload a payment screenshot')
      return
    }

    setIsLoading(true)

    try {
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('email', formData.email)
      submitData.append('plan', selectedPlan)
      submitData.append('gcash_ref', formData.gcashRef)
      submitData.append('screenshot', screenshot)

      const res = await fetch('/api/payment/submit-proof', {
        method: 'POST',
        body: submitData
      })

      const data = await res.json()

      if (data.success) {
        setPaymentId(data.payment_id)
        setIsSubmitted(true)
      } else {
        setError(data.error || 'Payment submission failed')
      }
    } catch (err) {
      setError('Failed to submit payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="payment-page">
        <Navbar />
        <div className="payment-container">
          <div className="success-container">
            <div className="success-icon">✓</div>
            <h1>Payment Submitted!</h1>
            <p>Thank you for your payment. We will verify your transaction and send your license key within 24 hours.</p>
            <p className="payment-id">Payment ID: {paymentId}</p>
            <p className="note">You will receive your license key via email at <strong>{formData.email}</strong></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-page">
      <Navbar />
      <div className="payment-container">
        <div className="payment-header">
          <h1>Complete Your Purchase</h1>
          <p>Pay via GCash and get your DevXFlow license</p>
        </div>
        
        <div className="payment-content">
          {/* Plan Selection */}
          <div className="plan-selection">
            <h2>Choose Your Plan</h2>
            <div className="plans-grid">
              {plans.map(plan => (
                <div 
                  key={plan.id}
                  className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.featured ? 'featured' : ''}`}
                  onClick={() => plan.id !== 'enterprise' && setSelectedPlan(plan.id)}
                >
                  {plan.featured && <div className="popular-badge">Most Popular</div>}
                  <h3>{plan.name}</h3>
                  <div className="price">{plan.price}</div>
                  <p className="description">{plan.description}</p>
                  <ul className="features">
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                  <button type="button" className="btn-select">
                    {selectedPlan === plan.id ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedPlan !== 'enterprise' && (
            <div className="payment-form-container">
              {/* QR Code Section */}
              <div className="qr-section">
                <h2>Scan to Pay via GCash</h2>
                <div className="qr-code">
                  {qrUrl ? (
                    <img src={qrUrl} alt="GCash QR Code" />
                  ) : (
                    <div className="qr-placeholder">Loading QR...</div>
                  )}
                </div>
                <p className="gcash-number">GCash: {gcashNumber}</p>
                <p className="amount-to-pay">
                  Amount to send: <strong>{plans.find(p => p.id === selectedPlan)?.price}</strong>
                </p>
              </div>

              {/* Payment Form */}
              <form className="payment-form" onSubmit={handleSubmit}>
                <h2>Submit Payment Proof</h2>
                
                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Juan Dela Cruz"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                  <span className="hint">License key will be sent to this email</span>
                </div>

                <div className="form-group">
                  <label htmlFor="gcashRef">GCash Reference Number</label>
                  <input
                    type="text"
                    id="gcashRef"
                    name="gcashRef"
                    value={formData.gcashRef}
                    onChange={handleChange}
                    placeholder="e.g., 1234567890"
                    required
                    disabled={isLoading}
                  />
                  <span className="hint">Found in your GCash transaction history</span>
                </div>

                <div className="form-group">
                  <label htmlFor="screenshot">Payment Screenshot</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="screenshot"
                      name="screenshot"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      disabled={isLoading}
                    />
                    <div className="file-label">
                      {screenshot ? screenshot.name : 'Choose file or drag here'}
                    </div>
                  </div>
                  {screenshotPreview && (
                    <div className="screenshot-preview">
                      <img src={screenshotPreview} alt="Payment proof preview" />
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-pay" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Payment'}
                </button>

                <p className="secure-payment">
                  🔒 Your payment will be verified within 24 hours. License key sent via email.
                </p>
              </form>
            </div>
          )}

          {selectedPlan === 'enterprise' && (
            <div className="enterprise-contact">
              <h2>Enterprise Pricing</h2>
              <p>Contact us for custom enterprise pricing tailored to your team's needs.</p>
              <a href="/contact" className="btn-contact">Contact Sales</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
