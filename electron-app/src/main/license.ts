import { machineIdSync } from 'node-machine-id'
import { app } from 'electron'
import * as path from 'node:path'
import * as fs from 'node:fs'

const API_BASE = 'https://devxflow.com/api/validation'
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
  }
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
}
