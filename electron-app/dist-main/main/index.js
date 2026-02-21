"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_2 = require("electron");
const window_js_1 = require("./window.js");
const index_js_1 = require("./ipc/index.js");
const license_js_1 = require("./license.js");
const isSingleInstance = electron_1.app.requestSingleInstanceLock();
if (!isSingleInstance) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Focus existing window if user tries to open another instance
    });
    electron_1.app.whenReady().then(async () => {
        // Check license on startup
        const licenseService = license_js_1.LicenseService.getInstance();
        const status = await licenseService.checkStoredLicense();
        console.log('License status:', status.valid ? 'Valid' : 'Invalid/Missing', status.error || '');
        (0, index_js_1.registerIpc)();
        (0, window_js_1.createMainWindow)();
        electron_1.app.on('activate', () => {
            if (process.platform === 'darwin' && electron_2.BrowserWindow.getAllWindows().length === 0) {
                (0, window_js_1.createMainWindow)();
            }
        });
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
}
