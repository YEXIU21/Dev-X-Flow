import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'

export function PaymentPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const planParam = searchParams.get('plan')
  const billingParam = searchParams.get('billing') || 'monthly'
  const [billing, setBilling] = useState<'monthly' | 'yearly'>(billingParam as 'monthly' | 'yearly')
  const isPreSelected = !!planParam && planParam !== 'enterprise'
  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (planParam === 'enterprise') {
      return 'enterprise'
    }
    return planParam || 'pro'
  })
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
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 199,
      yearlyPrice: 1499,
      monthlyDisplay: '₱199',
      yearlyDisplay: '₱125',
      description: 'For solo developers',
      featured: true,
      features: [
        'Everything in Starter',
        'AI-powered commits',
        'Database management',
        'Diff viewer',
        'Stash operations',
        'Debug monitor',
        'Up to 3 devices',
        'Pay via GCash'
      ]
    },
    {
      id: 'pro_plus',
      name: 'Pro+',
      monthlyPrice: 299,
      yearlyPrice: 2499,
      monthlyDisplay: '₱299',
      yearlyDisplay: '₱208',
      description: 'For power users',
      features: [
        'Everything in Pro',
        'Visual merge resolver',
        'Interactive rebase UI',
        'Advanced DB tools',
        'SQL import/export',
        'Selective restore',
        'Up to 8 devices',
        'Priority support',
        'Pay via GCash'
      ]
    },
    {
      id: 'teams',
      name: 'Teams',
      monthlyPrice: 599,
      yearlyPrice: 4999,
      monthlyDisplay: '₱599',
      yearlyDisplay: '₱417',
      description: 'Up to 10 members',
      features: [
        'Everything in Pro+',
        'Unlimited devices per member',
        'Team license dashboard',
        'Shared snippets & templates',
        'Admin controls',
        'API access',
        'Audit logs',
        'Dedicated support (4h)',
        'Pay via GCash'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      description: 'Large organizations',
      features: [
        'Everything in Teams',
        'Unlimited team members',
        'SSO / SAML integration',
        'Custom integrations',
        'On-premise deployment',
        'SLA guarantee',
        'Dedicated account manager',
        '24/7 phone support'
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
          {/* Plan Selection - only show if no plan pre-selected */}
          {!isPreSelected && (
            <div className="plan-selection">
              <h2>Choose Your Plan</h2>
              <div className="plans-grid">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.featured ? 'featured' : ''}`}
                    onClick={() => {
                      if (plan.id === 'enterprise') {
                        navigate('/contact?plan=enterprise')
                      } else {
                        setSelectedPlan(plan.id)
                      }
                    }}
                  >
                    {plan.featured && <div className="popular-badge">Most Popular</div>}
                    <h3>{plan.name}</h3>
                    <div className="price">
                      {plan.monthlyDisplay ? (
                        <>
                          {billing === 'monthly' ? plan.monthlyDisplay : plan.yearlyDisplay}<span className="price-period">/mo</span>
                        </>
                      ) : (
                        plan.price
                      )}
                    </div>
                    <p className="description">
                      {plan.yearlyPrice ? (
                        billing === 'yearly' ? `₱${plan.yearlyPrice.toLocaleString()} billed yearly • ` : 'Billed monthly • '
                      ) : ''}{plan.description}
                    </p>
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
          )}

          {/* Two-column layout when plan is pre-selected */}
          {isPreSelected && (
            <div className="payment-two-column">
              {/* Left Column - QR + Plan Info */}
              <div className="payment-left">
                <div className="qr-section">
                  <h2>Scan to Pay via GCash</h2>
                  <div className="qr-code">
                    {qrUrl ? (
                      <img src={qrUrl} alt="GCash QR Code" />
                    ) : (
                      <div className="qr-placeholder">Loading QR...</div>
                    )}
                  </div>
                  <p className="gcash-phone-label">Or send to:</p>
                  <p className="gcash-phone-number">{gcashNumber}</p>
                  <p className="amount-to-pay">
                    Amount to send: <strong>
                      {billing === 'yearly' 
                        ? `₱${plans.find(p => p.id === selectedPlan)?.yearlyPrice?.toLocaleString()}`
                        : `₱${plans.find(p => p.id === selectedPlan)?.monthlyPrice}`}
                    </strong>
                  </p>
                </div>
                
                <div className="selected-plan-summary">
                  <div className="summary-card">
                    <h2>{plans.find(p => p.id === selectedPlan)?.name} Plan</h2>
                    <div className="summary-price">
                      {billing === 'monthly' 
                        ? plans.find(p => p.id === selectedPlan)?.monthlyDisplay
                        : plans.find(p => p.id === selectedPlan)?.yearlyDisplay}/mo
                    </div>
                    <p className="summary-billing">
                      {billing === 'yearly' 
                        ? `₱${plans.find(p => p.id === selectedPlan)?.yearlyPrice?.toLocaleString()} billed yearly`
                        : 'Billed monthly'}
                    </p>
                    <Link to="/#pricing" className="change-plan-link">← Change plan</Link>
                  </div>
                </div>
              </div>

              {/* Right Column - Payment Form */}
              <div className="payment-right">
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
                      onChange={(e) => setFormData({ ...formData, gcashRef: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                      placeholder="13-digit reference"
                      maxLength={13}
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
            </div>
          )}

          {/* Original layout when no plan pre-selected */}
          {!isPreSelected && selectedPlan !== 'enterprise' && (
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
                  Amount to send: <strong>
                    {billing === 'yearly' 
                      ? `₱${plans.find(p => p.id === selectedPlan)?.yearlyPrice?.toLocaleString()}`
                      : `₱${plans.find(p => p.id === selectedPlan)?.monthlyPrice}`}
                  </strong>
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
                    onChange={(e) => setFormData({ ...formData, gcashRef: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                    placeholder="13-digit reference"
                    maxLength={13}
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
