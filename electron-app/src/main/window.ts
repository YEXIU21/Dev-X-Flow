import { BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'

let mainWindow: BrowserWindow | null = null

function createMenu(window: BrowserWindow) {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Repository',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            window.webContents.send('menu:open-repo')
          }
        },
        { type: 'separator' },
        {
          label: 'Refresh Status',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            window.webContents.send('menu:refresh')
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'License',
      submenu: [
        {
          label: 'View License Status',
          click: () => {
            window.webContents.send('license:show-modal')
          }
        },
        {
          label: 'Enter License Key',
          click: () => {
            window.webContents.send('license:show-activate')
          }
        },
        {
          label: 'Buy License',
          click: () => {
            void shell.openExternal('https://devxflow.com/pricing')
          }
        },
        { type: 'separator' },
        {
          label: 'Deactivate License',
          click: () => {
            window.webContents.send('license:deactivate')
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            void shell.openExternal('https://devxflow.com/docs')
          }
        },
        {
          label: 'Submit Feedback',
          click: () => {
            void shell.openExternal('https://devxflow.com/feedback')
          }
        },
        { type: 'separator' },
        {
          label: 'About Dev-X-Flow',
          click: () => {
            window.webContents.send('menu:about')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

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

  // Create application menu
  createMenu(mainWindow)

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist-renderer/index.html'))
  }

  return mainWindow
}
