import { BrowserWindow } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

export function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    show: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist-renderer/index.html'))
  }

  return mainWindow
}
