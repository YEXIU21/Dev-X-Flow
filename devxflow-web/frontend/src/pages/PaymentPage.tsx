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
          <p>Thank you for purchasing Dev-X-Flow-Pro. Your license key has been sent to your email.</p>
        </div>
        
        <style jsx>{`
          .payment-page {
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: calc(100vh - 60px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 120px 20px 60px;
          }
          
          .success-container {
            text-align: center;
            max-width: 500px;
          }
          
          .success-icon {
            font-size: 64px;
            color: var(--success);
            margin-bottom: 20px;
          }
          
          .success-container h1 {
            font-size: 36px;
            margin-bottom: 15px;
            color: var(--accent);
          }
          
          .success-container p {
            color: var(--text-secondary);
            margin-bottom: 30px;
            line-height: 1.6;
          }
        `}</style>
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

      <style jsx>{`
        .payment-page {
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: calc(100vh - 60px);
          padding: 40px 20px;
        }
        
        .payment-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 120px 20px 60px;
        }
        
        .payment-header {
          text-align: center;
          margin-bottom: 60px;
        }
        
        .payment-header h1 {
          font-size: 48px;
          margin-bottom: 15px;
          color: var(--accent);
        }
        
        .payment-header p {
          color: var(--text-secondary);
          font-size: 18px;
        }
        
        .payment-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
        }
        
        .plan-selection h2 {
          font-size: 24px;
          margin-bottom: 30px;
          color: var(--text-primary);
        }
        
        .plans-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .plan-card {
          background: var(--bg-secondary);
          border: 1px solid rgba(0, 212, 255, 0.1);
          border-radius: 16px;
          padding: 30px;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }
        
        .plan-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        
        .plan-card.selected {
          border-color: var(--accent);
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
        }
        
        .plan-card.featured {
          border-color: var(--accent);
        }
        
        .popular-badge {
          position: absolute;
          top: -10px;
          right: 20px;
          background: var(--accent);
          color: var(--bg-primary);
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .plan-card h3 {
          font-size: 20px;
          margin-bottom: 10px;
          color: var(--text-primary);
        }
        
        .price {
          font-size: 32px;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 5px;
        }
        
        .description {
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        
        .features {
          list-style: none;
          padding: 0;
          margin-bottom: 20px;
        }
        
        .features li {
          padding: 5px 0;
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .btn-select {
          background: transparent;
          border: 1px solid var(--accent);
          color: var(--accent);
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s;
        }
        
        .btn-select:hover {
          background: var(--accent);
          color: var(--bg-primary);
        }
        
        .payment-form-container {
          background: var(--bg-secondary);
          padding: 40px;
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .payment-form-container h2 {
          font-size: 24px;
          margin-bottom: 30px;
          color: var(--text-primary);
        }
        
        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .form-row:has(.form-group:only-child) {
          grid-template-columns: 1fr;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 14px;
        }
        
        .form-group input {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        
        .form-group input::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
        }
        
        .btn-pay {
          background: var(--accent);
          color: var(--bg-primary);
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
        }
        
        .btn-pay:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px var(--accent-glow);
        }
        
        .btn-pay:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .secure-payment {
          text-align: center;
          color: var(--text-secondary);
        }
        
        .security-info {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .security-info p {
          font-size: 12px;
          opacity: 0.7;
          margin-bottom: 5px;
        }
      `}</style>
    </div>
  )
}
