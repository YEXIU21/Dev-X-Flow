"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMainWindow = createMainWindow;
const electron_1 = require("electron");
const node_path_1 = require("node:path");
let mainWindow = null;
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 760,
        show: true,
        backgroundColor: '#0a0a0f',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: (0, node_path_1.join)(__dirname, '../preload/index.js'),
        },
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile((0, node_path_1.join)(__dirname, '../../dist-renderer/index.html'));
    }
    return mainWindow;
}
