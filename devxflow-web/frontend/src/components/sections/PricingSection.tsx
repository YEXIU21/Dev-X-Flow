import { useState } from 'react'
import { Link } from 'react-router-dom'

const plans = {
  monthly: {
    pro: { price: '₱199', amount: 199, yearly: '₱2,388' },
    pro_plus: { price: '₱299', amount: 299, yearly: '₱3,588' },
    teams: { price: '₱599', amount: 599, yearly: '₱7,188' }
  },
  yearly: {
    pro: { price: '₱125', amount: 125, total: '₱1,499' },
    pro_plus: { price: '₱208', amount: 208, total: '₱2,499' },
    teams: { price: '₱417', amount: 417, total: '₱4,999' }
  }
}

export function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <section className="pricing" id="pricing">
      <div className="section-title">
        <h2>Choose Your Plan</h2>
        <p>From solo developers to enterprise teams</p>
      </div>
      
      {/* Billing Toggle */}
      <div className="billing-toggle">
        <button 
          className={`toggle-btn ${billing === 'monthly' ? 'active' : ''}`}
          onClick={() => setBilling('monthly')}
        >
          Monthly
        </button>
        <button 
          className={`toggle-btn ${billing === 'yearly' ? 'active' : ''}`}
          onClick={() => setBilling('yearly')}
        >
          Yearly <span className="save-badge">Save 40%</span>
        </button>
      </div>
      
      <div className="pricing-grid five-cards">
        {/* Free Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Free Trial</div>
          <h3>Starter</h3>
          <div className="price">Free</div>
          <p style={{color: 'var(--text-secondary)'}}>30-day trial</p>
          <div className="pricing-button-wrapper">
            <Link to="/register" className="btn btn-secondary pricing-btn">Start Free Trial</Link>
          </div>
          <ul className="pricing-features">
            <li>✓ Basic Git operations</li>
            <li>✓ Terminal access</li>
            <li>✓ Dark mode</li>
            <li>✓ View commit history</li>
            <li>✓ Up to 2 devices</li>
            <li className="feature-disabled">✗ AI commit messages</li>
            <li className="feature-disabled">✗ Database tools</li>
            <li className="feature-disabled">✗ Merge resolver</li>
          </ul>
        </div>
        
        {/* Pro Tier */}
        <div className="pricing-card featured">
          <div className="pricing-badge popular">Most Popular</div>
          <h3>Pro</h3>
          <div className="price">{plans[billing].pro.price}<span className="price-period">/mo</span></div>
          <p style={{color: 'var(--text-secondary)'}}>
            {billing === 'yearly' ? `${plans.yearly.pro.total} billed yearly • ` : 'Billed monthly • '}For solo developers
          </p>
          <div className="pricing-button-wrapper">
            <Link to={`/payment?plan=pro&billing=${billing}`} className="btn btn-primary pricing-btn">Buy Pro</Link>
          </div>
          <ul className="pricing-features">
            <li>✓ Everything in Starter</li>
            <li>✓ AI-powered commits</li>
            <li>✓ Database management</li>
            <li>✓ Diff viewer</li>
            <li>✓ Stash operations</li>
            <li>✓ Debug monitor</li>
            <li>✓ Up to 3 devices</li>
            <li className="feature-disabled">✗ Merge resolver</li>
            <li className="feature-disabled">✗ Interactive rebase</li>
          </ul>
        </div>
        
        {/* Pro+ Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Best Value</div>
          <h3>Pro+</h3>
          <div className="price">{plans[billing].pro_plus.price}<span className="price-period">/mo</span></div>
          <p style={{color: 'var(--text-secondary)'}}>
            {billing === 'yearly' ? `${plans.yearly.pro_plus.total} billed yearly • ` : 'Billed monthly • '}For power users
          </p>
          <div className="pricing-button-wrapper">
            <Link to={`/payment?plan=pro_plus&billing=${billing}`} className="btn btn-secondary pricing-btn">Buy Pro+</Link>
          </div>
          <ul className="pricing-features">
            <li>✓ Everything in Pro</li>
            <li>✓ Visual merge resolver</li>
            <li>✓ Interactive rebase UI</li>
            <li>✓ Advanced DB tools</li>
            <li>✓ SQL import/export</li>
            <li>✓ Selective restore</li>
            <li>✓ Up to 8 devices</li>
            <li>✓ Priority support</li>
          </ul>
        </div>

        {/* Teams Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Teams</div>
          <h3>Teams</h3>
          <div className="price">{plans[billing].teams.price}<span className="price-period">/mo</span></div>
          <p style={{color: 'var(--text-secondary)'}}>
            {billing === 'yearly' ? `${plans.yearly.teams.total} billed yearly • ` : 'Billed monthly • '}Up to 10 members
          </p>
          <div className="pricing-button-wrapper">
            <Link to={`/payment?plan=teams&billing=${billing}`} className="btn btn-secondary pricing-btn">Buy Teams</Link>
          </div>
          <ul className="pricing-features">
            <li>✓ Everything in Pro+</li>
            <li>✓ Unlimited devices per member</li>
            <li>✓ Team license dashboard</li>
            <li>✓ Shared snippets & templates</li>
            <li>✓ Admin controls</li>
            <li>✓ API access</li>
            <li>✓ Audit logs</li>
            <li>✓ Dedicated support (4h)</li>
            <li>✓ Custom onboarding</li>
          </ul>
        </div>

        {/* Enterprise Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Enterprise</div>
          <h3>Enterprise</h3>
          <div className="price">Custom</div>
          <p style={{color: 'var(--text-secondary)'}}>Large organizations</p>
          <div className="pricing-button-wrapper">
            <Link to="/contact?plan=enterprise" className="btn btn-secondary pricing-btn">Contact Sales</Link>
          </div>
          <ul className="pricing-features">
            <li>✓ Everything in Teams</li>
            <li>✓ Unlimited team members</li>
            <li>✓ SSO / SAML integration</li>
            <li>✓ Custom integrations</li>
            <li>✓ On-premise deployment</li>
            <li>✓ SLA guarantee</li>
            <li>✓ Dedicated account manager</li>
            <li>✓ 24/7 phone support</li>
            <li>✓ Custom training</li>
          </ul>
        </div>
      </div>
      
      <div style={{textAlign: 'center', marginTop: '40px'}}>
        <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
          All paid plans include 1 year of updates and email support. 
          <Link to="/compare" style={{color: 'var(--accent)', marginLeft: '8px'}}>Compare all features →</Link>
        </p>
      </div>
    </section>
  )
}
