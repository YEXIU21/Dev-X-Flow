import { app } from 'electron'
import { BrowserWindow } from 'electron'
import { createMainWindow } from './window.js'
import { registerIpc } from './ipc/index.js'
import { LicenseService } from './license.js'

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window if user tries to open another instance
  })

  app.whenReady().then(async () => {
    // Check license on startup
    const licenseService = LicenseService.getInstance()
    const status = await licenseService.checkStoredLicense()
    console.log('License status:', status.valid ? 'Valid' : 'Invalid/Missing', status.error || '')

    registerIpc()
    createMainWindow()

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
