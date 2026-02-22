import React from 'react'

interface TrialBadgeProps {
  expiresAt: string | null
  tier: string
}

export const TrialBadge: React.FC<TrialBadgeProps> = ({ expiresAt, tier }) => {
  // Calculate days remaining
  const getDaysRemaining = (): number | null => {
    if (!expiresAt) return null
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const daysRemaining = getDaysRemaining()

  // Don't show for paid tiers without expiration
  if (tier !== 'free' && !daysRemaining) return null

  // Free tier - show elegant "STARTER" badge
  if (tier === 'free') {
    return (
      <div className="trial-badge-enterprise">
        <span className="tier-indicator starter">STARTER</span>
      </div>
    )
  }

  // Show countdown for trial/paid with expiration
  if (daysRemaining !== null) {
    const isExpiringSoon = daysRemaining <= 3
    return (
      <div className="trial-badge-enterprise">
        <span className={`tier-indicator ${isExpiringSoon ? 'expiring' : 'active'}`}>
          {daysRemaining}D
        </span>
      </div>
    )
  }

  return null
}

export default TrialBadge
