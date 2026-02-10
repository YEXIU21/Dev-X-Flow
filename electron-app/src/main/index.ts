import { app } from 'electron'
import { BrowserWindow } from 'electron'
import { createMainWindow } from './window.js'
import { registerIpc } from './ipc/index.js'

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window if user tries to open another instance
  })

  app.whenReady().then(() => {
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
