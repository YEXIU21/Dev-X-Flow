"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseService = void 0;
const node_machine_id_1 = require("node-machine-id");
const electron_1 = require("electron");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const API_BASE = 'https://devxflow.com/api/validation';
const API_KEY = 'devxflow-desktop-key'; // Should be environment variable in production
class LicenseService {
    static instance;
    currentLicense = null;
    deviceId = null;
    heartbeatTimer = null;
    constructor() {
        this.deviceId = (0, node_machine_id_1.machineIdSync)();
    }
    static getInstance() {
        if (!LicenseService.instance) {
            LicenseService.instance = new LicenseService();
        }
        return LicenseService.instance;
    }
    getLicensePath() {
        return path.join(electron_1.app.getPath('userData'), '.license');
    }
    async checkStoredLicense() {
        try {
            const p = this.getLicensePath();
            if (fs.existsSync(p)) {
                const key = fs.readFileSync(p, 'utf8').trim();
                return await this.activate(key);
            }
        }
        catch (e) {
            console.error('License check error:', e);
        }
        return { valid: false, error: 'No license found' };
    }
    async activate(licenseKey) {
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
            });
            const data = await response.json();
            if (data.valid) {
                this.currentLicense = licenseKey;
                fs.writeFileSync(this.getLicensePath(), licenseKey);
                this.startHeartbeat();
            }
            return data;
        }
        catch (e) {
            return { valid: false, error: 'Connection failed' };
        }
    }
    startHeartbeat() {
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(async () => {
            if (!this.currentLicense)
                return;
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
                });
                const data = await response.json();
                if (!data.valid) {
                    console.error('Heartbeat failed, license invalid');
                    electron_1.app.quit(); // Force close if license invalidated
                }
            }
            catch (e) {
                console.warn('Heartbeat connection failed, retrying next cycle...');
            }
        }, 1000 * 60 * 15); // Every 15 minutes
    }
}
exports.LicenseService = LicenseService;
