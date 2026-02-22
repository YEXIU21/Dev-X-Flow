import { Link } from 'react-router-dom'

export function PricingSection() {
  return (
    <section className="pricing" id="pricing">
      <div className="section-title">
        <h2>Choose Your Plan</h2>
        <p>From solo developers to enterprise teams</p>
      </div>
      
      <div className="pricing-grid four-cards">
        {/* Free Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Free Trial</div>
          <h3>Starter</h3>
          <div className="price">Free</div>
          <p style={{color: 'var(--text-secondary)'}}>30-day trial</p>
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
          <Link to="/register" className="btn btn-secondary" style={{display: 'inline-block'}}>Start Free Trial</Link>
        </div>
        
        {/* Pro Tier */}
        <div className="pricing-card featured">
          <div className="pricing-badge popular">Most Popular</div>
          <h3>Pro</h3>
          <div className="price">₱399<span className="price-period">/year</span></div>
          <p style={{color: 'var(--text-secondary)'}}>For solo developers</p>
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
          <Link to="/payment?plan=pro" className="btn btn-primary" style={{display: 'inline-block'}}>Buy Pro</Link>
        </div>
        
        {/* Pro+ Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Best Value</div>
          <h3>Pro+</h3>
          <div className="price">₱599<span className="price-period">/year</span></div>
          <p style={{color: 'var(--text-secondary)'}}>For power users</p>
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
          <Link to="/payment?plan=pro_plus" className="btn btn-secondary" style={{display: 'inline-block'}}>Buy Pro+</Link>
        </div>

        {/* Teams Tier */}
        <div className="pricing-card">
          <div className="pricing-badge">Enterprise</div>
          <h3>Teams</h3>
          <div className="price">₱1,999<span className="price-period">/year</span></div>
          <p style={{color: 'var(--text-secondary)'}}>Up to 10 members</p>
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
          <Link to="/contact?plan=teams" className="btn btn-secondary" style={{display: 'inline-block'}}>Contact Sales</Link>
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
