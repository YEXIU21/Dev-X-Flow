import { Link } from 'react-router-dom'

export function PricingSection() {
  return (
    <section className="pricing" id="pricing">
      <div className="section-title">
        <h2>Flexible Pricing</h2>
        <p>Choose the plan that fits your needs</p>
      </div>
      
      <div className="pricing-grid">
        <div className="pricing-card">
          <h3>1 Year</h3>
          <div className="price">₱399</div>
          <p style={{color: 'var(--text-secondary)'}}>Annual license</p>
          <ul className="pricing-features">
            <li>All features included</li>
            <li>Up to 3 devices</li>
            <li>1 year of updates</li>
            <li>Email support</li>
            <li>Pay via GCash</li>
          </ul>
          <Link to="/payment?plan=1year" className="btn btn-secondary" style={{display: 'inline-block'}}>Buy Now</Link>
        </div>
        
        <div className="pricing-card featured">
          <h3>3 Years</h3>
          <div className="price">₱899</div>
          <p style={{color: 'var(--text-secondary)'}}>Best value - save ₱298</p>
          <ul className="pricing-features">
            <li>All features included</li>
            <li>Up to 5 devices</li>
            <li>3 years of updates</li>
            <li>Priority support</li>
            <li>Pay via GCash</li>
          </ul>
          <Link to="/payment?plan=3year" className="btn btn-primary" style={{display: 'inline-block'}}>Buy Now</Link>
        </div>
        
        <div className="pricing-card">
          <h3>Enterprise</h3>
          <div className="price" style={{fontSize: '2rem'}}>Let's Talk</div>
          <p style={{color: 'var(--text-secondary)'}}>Custom solutions</p>
          <ul className="pricing-features">
            <li>All features included</li>
            <li>Unlimited devices</li>
            <li>Custom integrations</li>
            <li>Dedicated support</li>
            <li>SLA guarantee</li>
          </ul>
          <Link to="/contact" className="btn btn-secondary" style={{display: 'inline-block'}}>Contact Us</Link>
        </div>
      </div>
      
      <div style={{textAlign: 'center', marginTop: '30px'}}>
        <p style={{color: 'var(--text-secondary)'}}>
          <span style={{color: 'var(--accent)'}}>🎁</span> 
          Try free for 30 days - no credit card required
          <Link to="/register" style={{color: 'var(--accent)', marginLeft: '10px'}}>Start Trial →</Link>
        </p>
      </div>
    </section>
  )
}
