import { app, protocol } from 'electron'
import { BrowserWindow } from 'electron'
import { createMainWindow } from './window.js'
import { registerIpc } from './ipc/index.js'
import { LicenseService } from './license.js'
import { handleAuthCallback } from './ipc/license.js'

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window if user tries to open another instance
  })

  // Register deep link protocol before app is ready
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('devxflow', process.execPath, [process.argv[1]])
    }
  } else {
    app.setAsDefaultProtocolClient('devxflow')
  }

  app.whenReady().then(async () => {
    // Check license on startup
    const licenseService = LicenseService.getInstance()
    const status = await licenseService.checkStoredLicense()
    console.log('License status:', status.valid ? 'Valid' : 'Invalid/Missing', status.error || '')

    registerIpc()
    createMainWindow()

    // Handle deep link protocol (devxflow://auth/callback?token=xxx)
    app.on('open-url', async (event, url) => {
      event.preventDefault()
      
      // Parse the deep link URL
      try {
        const urlObj = new URL(url)
        if (urlObj.protocol === 'devxflow:' && urlObj.pathname === '/auth/callback') {
          const token = urlObj.searchParams.get('token')
          if (token) {
            const authStatus = await handleAuthCallback(token)
            if (authStatus.authenticated) {
              console.log('Auth successful via deep link')
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse deep link:', e)
      }
    })

    app.on('activate', () => {
      if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
