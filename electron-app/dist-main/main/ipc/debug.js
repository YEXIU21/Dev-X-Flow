import { ipcMain, shell } from 'electron';
import { watch } from 'node:fs';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// Track active file watchers
const activeWatchers = new Map();
// Store last known content to detect changes
const lastKnownContent = new Map();
/**
 * Detect Laravel log file in the repository
 * Looks for storage/logs/laravel.log or dated log files
 */
function detectLaravelLog(repoPath) {
    const logsDir = join(repoPath, 'storage', 'logs');
    if (!existsSync(logsDir)) {
        return null;
    }
    // Primary: laravel.log
    const primaryLog = join(logsDir, 'laravel.log');
    if (existsSync(primaryLog)) {
        return primaryLog;
    }
    // Secondary: dated log files (laravel-YYYY-MM-DD.log)
    try {
        const files = readdirSync(logsDir);
        const logFiles = files
            .filter(f => f.startsWith('laravel-') && f.endsWith('.log'))
            .map(f => ({
            name: f,
            path: join(logsDir, f),
            mtime: statSync(join(logsDir, f)).mtime.getTime()
        }))
            .sort((a, b) => b.mtime - a.mtime);
        if (logFiles.length > 0) {
            return logFiles[0].path;
        }
    }
    catch {
        // Ignore errors reading directory
    }
    // Fallback: any .log file in the directory
    try {
        const files = readdirSync(logsDir);
        const anyLog = files.find(f => f.endsWith('.log'));
        if (anyLog) {
            return join(logsDir, anyLog);
        }
    }
    catch {
        // Ignore errors
    }
    return null;
}
/**
 * Parse a log line and determine its level
 */
function parseLogLevel(line) {
    // Laravel log format: [YYYY-MM-DD HH:MM:SS] environment.LEVEL: message
    const laravelPattern = /\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s+\w+\.(ERROR|WARNING|INFO|DEBUG)/;
    const match = line.match(laravelPattern);
    if (match) {
        const level = match[1].toLowerCase();
        if (level === 'error')
            return 'error';
        if (level === 'warning')
            return 'warning';
        if (level === 'info')
            return 'info';
        if (level === 'debug')
            return 'debug';
    }
    // Stack trace detection
    if (line.includes('Stack trace:') ||
        line.includes('#0 ') ||
        line.includes('Exception') ||
        line.includes('Error:') ||
        /^#\d+\s+/.test(line)) {
        return 'error';
    }
    // Timestamp detection
    if (/^\[\d{4}-\d{2}-\d{2}/.test(line)) {
        return 'timestamp';
    }
    return 'other';
}
/**
 * Read and parse log file
 */
function readLogFile(filePath, maxLines = 500) {
    if (!existsSync(filePath)) {
        return {
            lines: [],
            summary: { errors: 0, warnings: 0, info: 0, debug: 0, total: 0 },
            filePath: null,
            truncated: false
        };
    }
    try {
        const content = readFileSync(filePath, 'utf-8');
        const allLines = content.split('\n');
        // Show only last maxLines to avoid performance issues
        const truncated = allLines.length > maxLines;
        const linesToShow = truncated ? allLines.slice(-maxLines) : allLines;
        const lines = linesToShow.map(text => ({
            text,
            level: parseLogLevel(text)
        }));
        // Count by level
        const summary = {
            errors: lines.filter(l => l.level === 'error').length,
            warnings: lines.filter(l => l.level === 'warning').length,
            info: lines.filter(l => l.level === 'info').length,
            debug: lines.filter(l => l.level === 'debug').length,
            total: lines.length
        };
        return {
            lines,
            summary,
            filePath,
            truncated
        };
    }
    catch (error) {
        return {
            lines: [{ text: `Error reading log file: ${error}`, level: 'error' }],
            summary: { errors: 1, warnings: 0, info: 0, debug: 0, total: 1 },
            filePath: null,
            truncated: false
        };
    }
}
/**
 * Watch log file for changes
 */
function watchLogFile(repoPath, callback) {
    // Stop any existing watcher for this repo
    stopWatching(repoPath);
    const logPath = detectLaravelLog(repoPath);
    if (!logPath) {
        return null;
    }
    // Initial read
    const initialResult = readLogFile(logPath);
    lastKnownContent.set(repoPath, initialResult.lines.map(l => l.text).join('\n'));
    callback(initialResult);
    // Start watching
    const watcher = watch(logPath, (eventType) => {
        if (eventType === 'change') {
            const result = readLogFile(logPath);
            const newContent = result.lines.map(l => l.text).join('\n');
            // Only callback if content actually changed
            if (newContent !== lastKnownContent.get(repoPath)) {
                lastKnownContent.set(repoPath, newContent);
                callback(result);
            }
        }
    });
    activeWatchers.set(repoPath, watcher);
    return logPath;
}
/**
 * Stop watching a log file
 */
function stopWatching(repoPath) {
    const watcher = activeWatchers.get(repoPath);
    if (watcher) {
        watcher.close();
        activeWatchers.delete(repoPath);
        lastKnownContent.delete(repoPath);
    }
}
/**
 * Open log file in default editor
 */
function openLogFile(filePath) {
    if (!existsSync(filePath)) {
        return false;
    }
    try {
        shell.openPath(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Register debug IPC handlers
 */
export function registerDebugIpc() {
    // Detect log file
    ipcMain.handle('debug:detect-log', async (_event, repoPath) => {
        return detectLaravelLog(repoPath);
    });
    // Read log file (one-time)
    ipcMain.handle('debug:read-log', async (_event, repoPath) => {
        const logPath = detectLaravelLog(repoPath);
        if (!logPath) {
            return {
                lines: [],
                summary: { errors: 0, warnings: 0, info: 0, debug: 0, total: 0 },
                filePath: null,
                truncated: false
            };
        }
        return readLogFile(logPath);
    });
    // Start watching log file
    // Returns a promise that resolves when file is found, then sends updates via events
    ipcMain.handle('debug:watch-start', async (event, repoPath) => {
        const logPath = watchLogFile(repoPath, (result) => {
            // Send update to renderer
            event.sender.send('debug:update', result);
        });
        return {
            success: logPath !== null,
            filePath: logPath
        };
    });
    // Stop watching
    ipcMain.handle('debug:watch-stop', async (_event, repoPath) => {
        stopWatching(repoPath);
        return true;
    });
    // Open log file externally
    ipcMain.handle('debug:open-log', async (_event, filePath) => {
        return openLogFile(filePath);
    });
}
export { detectLaravelLog, readLogFile, watchLogFile, stopWatching, openLogFile };
