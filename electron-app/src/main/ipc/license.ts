import { ipcMain, BrowserWindow, shell } from 'electron'
import { LicenseService, LicenseTier } from '../license'

export function registerLicenseIPC() {
  const licenseService = LicenseService.getInstance()

  // Check license status
  ipcMain.handle('license:check', async () => {
    try {
      const status = await licenseService.checkStoredLicense()
      return {
        valid: status.valid,
        tier: status.license?.tier || 'free',
        expires_at: status.license?.expires_at,
        features: status.license?.features || [],
        error: status.error
      }
    } catch (error) {
      return { valid: false, tier: 'free', error: 'Failed to check license' }
    }
  })

  // Activate license
  ipcMain.handle('license:activate', async (_event, licenseKey: string) => {
    try {
      const status = await licenseService.activate(licenseKey)

      // Broadcast status update to all windows
      if (status.valid) {
        BrowserWindow.getAllWindows().forEach(window => {
          window.webContents.send('license:status', {
            valid: true,
            tier: status.license?.tier || 'free',
            expires_at: status.license?.expires_at
          })
        })
      }

      return {
        valid: status.valid,
        tier: status.license?.tier || 'free',
        expires_at: status.license?.expires_at,
        features: status.license?.features || [],
        error: status.error
      }
    } catch (error) {
      return { valid: false, error: 'Activation failed' }
    }
  })

  // Deactivate license
  ipcMain.handle('license:deactivate', async () => {
    try {
      // Clear stored license
      const { app } = await import('electron')
      const path = await import('node:path')
      const fs = await import('node:fs')

      const licensePath = path.join(app.getPath('userData'), '.license')
      if (fs.existsSync(licensePath)) {
        fs.unlinkSync(licensePath)
      }

      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('license:status', {
          valid: false,
          tier: 'free',
          expires_at: null
        })
      })

      return { success: true }
    } catch (error) {
      return { success: false }
    }
  })

  // Get current tier
  ipcMain.handle('license:get-tier', async () => {
    try {
      const tier = await licenseService.getCurrentTier()
      return { tier }
    } catch (error) {
      return { tier: 'free' }
    }
  })

  // Check feature availability
  ipcMain.handle('license:check-feature', async (_event, feature: string) => {
    try {
      const available = await licenseService.checkFeature(feature)
      return { available }
    } catch (error) {
      return { available: false }
    }
  })

  // Open buy page
  ipcMain.handle('license:buy', async () => {
    await shell.openExternal('https://devxflow.com/pricing')
  })
}

export function broadcastLicenseExpired() {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('license:expired')
  })
}

export function broadcastLicenseStatus(status: { valid: boolean; tier: LicenseTier; expires_at?: string | null }) {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('license:status', status)
  })
}
