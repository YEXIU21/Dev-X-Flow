import React from 'react'

interface FeatureGateProps {
  feature: string
  tier: string
  requiredTier: 'free' | 'pro' | 'pro_plus' | 'teams'
  children: React.ReactNode
  onUpgrade: () => void
}

const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  teams: 3
}

const TIER_NAMES: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  pro_plus: 'Pro+',
  teams: 'Teams'
}

const TIER_PRICES: Record<string, string> = {
  pro: '₱399/year',
  pro_plus: '₱599/year',
  teams: '₱1,999/year'
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  tier,
  requiredTier,
  children,
  onUpgrade
}) => {
  const currentLevel = TIER_HIERARCHY[tier] || 0
  const requiredLevel = TIER_HIERARCHY[requiredTier] || 0

  const hasAccess = currentLevel >= requiredLevel

  if (hasAccess) {
    return <>{children}</>
  }

  return (
    <div className="feature-locked-overlay">
      <div className="feature-locked-content">
        <div className="lock-icon">🔒</div>
        <h3>Feature Locked</h3>
        <p className="feature-name">{feature}</p>

        <div className="tier-comparison">
          <div className="current-tier">
            <span className="tier-label">Current</span>
            <span className="tier-value tier-current">{TIER_NAMES[tier] || 'Free'}</span>
          </div>
          <div className="tier-arrow">→</div>
          <div className="required-tier">
            <span className="tier-label">Required</span>
            <span className="tier-value tier-required">{TIER_NAMES[requiredTier]}</span>
          </div>
        </div>

        <div className="upgrade-cta">
          <p>Upgrade to {TIER_NAMES[requiredTier]} to unlock:</p>
          <ul className="feature-preview">
            {requiredTier === 'pro' && (
              <>
                <li>✨ AI-powered commit messages</li>
                <li>🗄️ Database management</li>
                <li>📊 Diff viewer & stash operations</li>
                <li>🐛 Debug monitor</li>
              </>
            )}
            {requiredTier === 'pro_plus' && (
              <>
                <li>🔀 Merge resolver</li>
                <li>🔄 Interactive rebase UI</li>
                <li>📤 Advanced database tools</li>
                <li>⚡ Priority support</li>
              </>
            )}
            {requiredTier === 'teams' && (
              <>
                <li>👥 Team collaboration</li>
                <li>📈 Admin dashboard</li>
                <li>🔌 API access</li>
                <li>🌐 Unlimited devices</li>
              </>
            )}
          </ul>
        </div>

        <button className="license-btn license-btn-primary license-btn-full" onClick={onUpgrade}>
          Upgrade Now ({TIER_PRICES[requiredTier]})
        </button>

        <p className="feature-note">
          Or continue with your current plan and limited features.
        </p>
      </div>
    </div>
  )
}

export default FeatureGate
