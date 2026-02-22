import { useState } from 'react'

export function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [formData, setFormData] = useState({
    email: '',
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const plans = [
    {
      id: 'basic',
      name: '1 Year',
      price: '₱399',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate payment processing
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
    }, 3000)
  }

  if (isSubmitted) {
    return (
      <div className="payment-page">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p>Thank you for purchasing Dev-X-Flow. Your license key has been sent to your email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>Complete Your Purchase</h1>
          <p>Choose your plan and secure your DevXFlow license</p>
        </div>
        
        <div className="payment-content">
          <div className="plan-selection">
            <h1>Get DevXFlow</h1>
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
                  <button className="btn-select">
                    {selectedPlan === plan.id ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {selectedPlan !== 'enterprise' && (
            <div className="payment-form-container">
              <h2>Payment Information</h2>
              <form className="payment-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cardName">Name on Card</label>
                    <input
                      type="text"
                      id="cardName"
                      name="cardName"
                      value={formData.cardName}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number</label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={formData.cardNumber}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryDate">Expiry Date</label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">CVV</label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      placeholder="123"
                      value={formData.cvv}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="billingAddress">Billing Address</label>
                    <input
                      type="text"
                      id="billingAddress"
                      name="billingAddress"
                      value={formData.billingAddress}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <button type="submit" className="btn-pay" disabled={isLoading}>
                  {isLoading ? 'Processing...' : `Pay ${plans.find(p => p.id === selectedPlan)?.price}`}
                </button>
                
                <p className="secure-payment">
                  🔒 Secure payments powered by PayMongo. 30-day money-back guarantee.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
