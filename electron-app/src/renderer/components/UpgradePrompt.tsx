import React from 'react'

interface UpgradePromptProps {
  feature: string
  currentTier: string
  requiredTier: 'pro' | 'pro_plus' | 'teams'
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

const TIER_NAMES: Record<string, string> = {
  pro: 'Pro',
  pro_plus: 'Pro+',
  teams: 'Teams'
}

const TIER_PRICES: Record<string, string> = {
  pro: '₱399/year',
  pro_plus: '₱599/year',
  teams: '₱1,999/year'
}

const FEATURE_BENEFITS: Record<string, string[]> = {
  ai_commits: [
    'Generate commit messages with GPT-4, Claude, or Gemini',
    'Smart diff analysis and context awareness',
    'Custom commit templates and conventions'
  ],
  database_basic: [
    'Connect to SQLite, MySQL, PostgreSQL, SQL Server',
    'Visual query builder and editor',
    'Table management and data browsing'
  ],
  database_advanced: [
    'SQL import and export tools',
    'Selective backup and restore',
    'Database migration assistance'
  ],
  diff_viewer: [
    'Side-by-side diff comparison',
    'Syntax highlighting for all languages',
    'Inline change navigation'
  ],
  stash_ops: [
    'Create, apply, and manage stashes',
    'Stash browser with preview',
    'Partial stash operations'
  ],
  debug_monitor: [
    'Real-time Laravel log monitoring',
    'Error tracking and alerting',
    'Log filtering and search'
  ],
  merge_resolver: [
    'Visual three-way merge interface',
    'Conflict detection and navigation',
    'Automatic conflict resolution suggestions'
  ],
  interactive_rebase: [
    'Drag-and-drop commit reordering',
    'Visual squash and pick interface',
    'Interactive conflict resolution'
  ],
  team_collaboration: [
    'Shared snippets and templates',
    'Team activity dashboard',
    'Collaborative debugging sessions'
  ],
  default: [
    'Unlock premium features',
    'Priority customer support',
    'Early access to new features'
  ]
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  currentTier,
  requiredTier,
  isOpen,
  onClose,
  onUpgrade
}) => {
  if (!isOpen) return null

  const benefits = FEATURE_BENEFITS[feature] || FEATURE_BENEFITS.default

  return (
    <div className="license-modal-overlay" onClick={onClose}>
      <div className="license-modal upgrade-prompt" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-header">
          <div className="upgrade-icon">⭐</div>
          <h2>Upgrade Required</h2>
          <p className="upgrade-subtitle">
            {feature} is available in {TIER_NAMES[requiredTier]} tier
          </p>
        </div>

        <div className="current-plan-badge">
          <span className="plan-label">Current Plan:</span>
          <span className="plan-value">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1).replace('_', ' ')}</span>
        </div>

        <div className="upgrade-benefits">
          <h4>What you get with {TIER_NAMES[requiredTier]}:</h4>
          <ul>
            {benefits.map((benefit, index) => (
              <li key={index}>✅ {benefit}</li>
            ))}
          </ul>
        </div>

        <div className="upgrade-pricing">
          <div className="price-tag">{TIER_PRICES[requiredTier]}</div>
          <p className="price-note">Cancel anytime. 30-day money-back guarantee.</p>
        </div>

        <div className="upgrade-actions">
          <button className="license-btn license-btn-primary license-btn-full" onClick={onUpgrade}>
            Upgrade to {TIER_NAMES[requiredTier]}
          </button>
          <button className="license-btn license-btn-outline license-btn-full" onClick={onClose}>
            Maybe Later
          </button>
        </div>

        <button className="license-close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}

export default UpgradePrompt
