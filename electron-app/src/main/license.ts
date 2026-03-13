import { machineIdSync } from 'node-machine-id'
import { app, shell } from 'electron'
import * as path from 'node:path'
import * as fs from 'node:fs'

const API_BASE = 'https://devxflow.com/api/validation'
const WEB_BASE = 'https://devxflow.com'
const API_KEY = 'devxflow-desktop-key' // Should be environment variable in production

interface LicenseStatus {
  valid: boolean
  error?: string
  license?: {
    key: string
    status: string
    customer_email: string
    expires_at: string | null
    max_activations: number
    current_activations: number
    device_id: string
    tier: 'free' | 'pro' | 'pro_plus' | 'teams'
    features: string[]
  }
}

interface AuthStatus {
  authenticated: boolean
  user?: {
    id: string
    email: string
    name: string
  }
  trial?: {
    active: boolean
    expires_at: string
    days_remaining: number
  }
  license?: {
    key: string
    tier: string
  }
}

export type LicenseTier = 'free' | 'pro' | 'pro_plus' | 'teams'

interface FeatureConfig {
  [key: string]: LicenseTier[]
}

export const FEATURE_FLAGS: FeatureConfig = {
  // Free tier features
  'basic_git': ['free', 'pro', 'pro_plus', 'teams'],
  'terminal': ['free', 'pro', 'pro_plus', 'teams'],
  'dark_mode': ['free', 'pro', 'pro_plus', 'teams'],
  
  // Pro tier features
  'ai_commits': ['pro', 'pro_plus', 'teams'],
  'database_basic': ['pro', 'pro_plus', 'teams'],
  'diff_viewer': ['pro', 'pro_plus', 'teams'],
  'stash_ops': ['pro', 'pro_plus', 'teams'],
  'debug_monitor': ['pro', 'pro_plus', 'teams'],
  
  // Pro+ tier features
  'merge_resolver': ['pro_plus', 'teams'],
  'interactive_rebase': ['pro_plus', 'teams'],
  'database_advanced': ['pro_plus', 'teams'],
  
  // Teams tier features
  'team_collaboration': ['teams'],
  'admin_dashboard': ['teams'],
  'api_access': ['teams'],
  'unlimited_devices': ['teams']
}

export class LicenseService {
  private static instance: LicenseService
  private currentLicense: string | null = null
  private deviceId: string | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.deviceId = machineIdSync()
  }

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService()
    }
    return LicenseService.instance
  }

  private getLicensePath(): string {
    return path.join(app.getPath('userData'), '.license')
  }

  public async checkStoredLicense(): Promise<LicenseStatus> {
    try {
      const p = this.getLicensePath()
      if (fs.existsSync(p)) {
        const key = fs.readFileSync(p, 'utf8').trim()
        return await this.activate(key)
      }
    } catch (e) {
      console.error('License check error:', e)
    }
    return { valid: false, error: 'No license found' }
  }

  public async activate(licenseKey: string): Promise<LicenseStatus> {
    try {
      const response = await fetch(`${API_BASE}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          license_key: licenseKey,
          hardware_info: this.deviceId
        })
      })

      const data = await response.json() as LicenseStatus

      if (data.valid) {
        this.currentLicense = licenseKey
        fs.writeFileSync(this.getLicensePath(), licenseKey)
        this.startHeartbeat()
      }

      return data
    } catch (e) {
      return { valid: false, error: 'Connection failed' }
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    
    this.heartbeatTimer = setInterval(async () => {
      if (!this.currentLicense) return

      try {
        const response = await fetch(`${API_BASE}/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify({
            license_key: this.currentLicense,
            hardware_info: this.deviceId
          })
        })

        const data = await response.json()
        if (!data.valid) {
          console.error('Heartbeat failed, license invalid')
          app.quit() // Force close if license invalidated
        }
      } catch (e) {
        console.warn('Heartbeat connection failed, retrying next cycle...')
      }
    }, 1000 * 60 * 15) // Every 15 minutes
  }

  // Feature flag checking methods
  public async getCurrentTier(): Promise<LicenseTier> {
    const status = await this.checkStoredLicense()
    if (!status.valid || !status.license) {
      return 'free' // Default to free tier if no valid license
    }
    return status.license.tier || 'free'
  }

  public isFeatureAvailable(featureName: string, tier: LicenseTier): boolean {
    const allowedTiers = FEATURE_FLAGS[featureName]
    if (!allowedTiers) {
      console.warn(`Feature ${featureName} not found in feature flags`)
      return false
    }
    return allowedTiers.includes(tier)
  }

  public async checkFeature(featureName: string): Promise<boolean> {
    const tier = await this.getCurrentTier()
    return this.isFeatureAvailable(featureName, tier)
  }

  public getAvailableFeatures(tier: LicenseTier): string[] {
    return Object.entries(FEATURE_FLAGS)
      .filter(([_, tiers]) => tiers.includes(tier))
      .map(([feature]) => feature)
  }

  public async getAllAvailableFeatures(): Promise<string[]> {
    const tier = await this.getCurrentTier()
    return this.getAvailableFeatures(tier)
  }

  // Authentication & Trial Methods
  public async getAuthStatus(): Promise<AuthStatus> {
    try {
      const response = await fetch(`${API_BASE}/auth/status`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'x-device-id': this.deviceId || ''
        }
      })
      return await response.json() as AuthStatus
    } catch (e) {
      return { authenticated: false }
    }
  }

  public openLoginInBrowser(): void {
    // Open web login with callback to electron app via deep link
    const callbackUrl = `devxflow://auth/callback`
    const loginUrl = `${WEB_BASE}/login?redirect=${encodeURIComponent(callbackUrl)}&client=electron`
    shell.openExternal(loginUrl)
  }

  public async startTrial(): Promise<{ success: boolean; trial?: AuthStatus['trial']; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/trial/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-device-id': this.deviceId || ''
        }
      })
      const data = await response.json()
      if (data.success) {
        return { success: true, trial: data.trial }
      }
      return { success: false, error: data.error || 'Failed to start trial' }
    } catch (e) {
      return { success: false, error: 'Connection failed' }
    }
  }

  public async checkTrialStatus(): Promise<{ active: boolean; days_remaining: number; expires_at?: string }> {
    try {
      const response = await fetch(`${API_BASE}/trial/status`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'x-device-id': this.deviceId || ''
        }
      })
      const data = await response.json()
      return data
    } catch (e) {
      return { active: false, days_remaining: 0 }
    }
  }

  public async handleAuthCallback(token: string): Promise<AuthStatus> {
    try {
      const response = await fetch(`${API_BASE}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-device-id': this.deviceId || ''
        },
        body: JSON.stringify({ token })
      })
      const data = await response.json() as AuthStatus
      
      // If user has license, activate it
      if (data.license?.key) {
        await this.activate(data.license.key)
      }
      
      return data
    } catch (e) {
      return { authenticated: false }
    }
  }
}
