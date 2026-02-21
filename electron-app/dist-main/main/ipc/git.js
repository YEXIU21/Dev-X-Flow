"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGitIpc = registerGitIpc;
const electron_1 = require("electron");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const simple_git_1 = require("simple-git");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
electron_1.ipcMain.on('open-external-url', (event, url) => {
    electron_1.shell.openExternal(url);
});
async function getConflicts(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const status = await git.status();
    return status.conflicted;
}
async function getConflictVersion(repoPath, filePath, stage) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    if (!filePath)
        throw new Error('filePath is required');
    return await git.raw(['show', `:${stage}:${filePath}`]);
}
/**
 * Parse a conflicted file and extract base/ours/theirs sections
 */
async function parseConflictFile(repoPath, filePath) {
    const fullPath = (0, node_path_1.resolve)(repoPath, filePath);
    const content = (0, node_fs_1.readFileSync)(fullPath, 'utf-8');
    const baseLines = [];
    const oursLines = [];
    const theirsLines = [];
    let inConflict = false;
    let currentSection = null;
    for (const line of content.split('\n')) {
        if (line.startsWith('<<<<<<<')) {
            inConflict = true;
            currentSection = 'ours';
        }
        else if (line.startsWith('=======')) {
            currentSection = 'theirs';
        }
        else if (line.startsWith('>>>>>>>')) {
            inConflict = false;
            currentSection = null;
        }
        else {
            if (!inConflict) {
                // Common line - add to all sections
                baseLines.push(line);
                oursLines.push(line);
                theirsLines.push(line);
            }
            else if (currentSection === 'ours') {
                oursLines.push(line);
            }
            else if (currentSection === 'theirs') {
                theirsLines.push(line);
            }
        }
    }
    return {
        base: baseLines.join('\n'),
        ours: oursLines.join('\n'),
        theirs: theirsLines.join('\n')
    };
}
/**
 * Resolve a conflict by accepting one side
 */
async function resolveConflict(repoPath, filePath, side) {
    const fullPath = (0, node_path_1.resolve)(repoPath, filePath);
    const content = (0, node_fs_1.readFileSync)(fullPath, 'utf-8');
    const resolvedLines = [];
    let inConflict = false;
    let keepTheirs = false;
    for (const line of content.split('\n')) {
        if (line.startsWith('<<<<<<<')) {
            inConflict = true;
            keepTheirs = (side === 'theirs');
        }
        else if (line.startsWith('=======')) {
            keepTheirs = (side === 'ours');
        }
        else if (line.startsWith('>>>>>>>')) {
            inConflict = false;
            keepTheirs = false;
        }
        else {
            if (!inConflict || keepTheirs) {
                resolvedLines.push(line);
            }
        }
    }
    (0, node_fs_1.writeFileSync)(fullPath, resolvedLines.join('\n'), 'utf-8');
    return true;
}
/**
 * Mark a file as resolved by staging it
 */
async function markResolved(repoPath, filePath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    await git.add(filePath);
    return true;
}
/**
 * Load commits for interactive rebase
 */
async function loadRebaseCommits(repoPath, baseCommit) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    // Default to HEAD~10 if no base specified
    const base = baseCommit || 'HEAD~10';
    const log = await git.log({
        from: base,
        to: 'HEAD',
        format: {
            hash: '%H',
            message: '%s'
        }
    });
    // Return in reverse order (oldest first) for rebase todo
    return log.all.slice().reverse().map((commit) => ({
        action: 'pick',
        hash: commit.hash,
        message: commit.message
    }));
}
/**
 * Write git-rebase-todo file
 */
async function writeRebaseTodoFile(repoPath, items) {
    const gitDir = await (0, simple_git_1.simpleGit)({ baseDir: repoPath }).revparse(['--git-dir']);
    const todoPath = (0, node_path_1.resolve)(gitDir.trim(), 'rebase-merge', 'git-rebase-todo');
    const todoContent = items
        .filter(item => item.action !== 'drop')
        .map(item => `${item.action} ${item.hash} ${item.message}`)
        .join('\n');
    // Ensure directory exists
    const todoDir = (0, node_path_1.resolve)(gitDir.trim(), 'rebase-merge');
    if (!(0, node_fs_1.existsSync)(todoDir)) {
        throw new Error('Not in an interactive rebase. Start rebase first.');
    }
    (0, node_fs_1.writeFileSync)(todoPath, todoContent + '\n', 'utf-8');
    return true;
}
/**
 * Start interactive rebase
 */
async function startInteractiveRebase(repoPath, items) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    if (items.length === 0) {
        return 'No commits to rebase';
    }
    const firstCommit = items[0].hash;
    try {
        await git.raw(['rebase', '-i', `${firstCommit}^`]);
        return 'Rebase started successfully';
    }
    catch (error) {
        return `Rebase failed: ${error instanceof Error ? error.message : String(error)}`;
    }
}
async function getStatusSummary(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const status = await git.status();
    return {
        branch: status.current || 'unknown',
        staged: status.staged.length,
        modified: status.modified.length,
        created: status.created.length,
        deleted: status.deleted.length,
        renamed: status.renamed.length,
        conflicted: status.conflicted.length,
        ahead: status.ahead,
        behind: status.behind,
    };
}
async function getChanges(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const status = await git.status();
    return status.files.map((f) => ({ path: f.path, index: f.index, working_dir: f.working_dir }));
}
async function stageFiles(repoPath, paths) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    if (paths.length === 0)
        return;
    await git.add(paths);
}
async function unstageFiles(repoPath, paths) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    for (const p of paths) {
        await git.raw(['reset', 'HEAD', '--', p]);
    }
}
async function commit(repoPath, message) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const m = message.trim();
    if (!m)
        throw new Error('Commit message is required');
    await git.commit(m);
}
async function getDiff(repoPath, filePath, mode) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    if (!filePath)
        throw new Error('filePath is required');
    if (mode === 'staged') {
        return await git.diff(['--cached', '--', filePath]);
    }
    return await git.diff(['--', filePath]);
}
async function getLog(repoPath, maxCount) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const log = await git.log({ maxCount });
    return log.all.map((c) => ({
        hash: c.hash,
        date: c.date,
        message: c.message,
        author_name: c.author_name,
        author_email: c.author_email,
    }));
}
async function getLogGraph(repoPath, maxCount) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const count = Number.isFinite(maxCount) ? Math.max(1, Math.min(200, maxCount)) : 50;
    // Get graph output: oneline with graph, all branches, decorated
    const output = await git.raw(['log', '--oneline', '--graph', '--all', '--decorate', '-n', String(count)]);
    return output;
}
async function getCommitDetails(repoPath, hash) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    if (!hash)
        throw new Error('hash is required');
    return await git.show([hash, '--stat']);
}
async function listRemotes(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const remotes = await git.getRemotes(true);
    return remotes.map((r) => ({
        name: r.name,
        fetch: r.refs.fetch,
        push: r.refs.push,
    }));
}
async function addRemote(repoPath, name, url) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const n = name.trim();
    const u = url.trim();
    if (!n)
        throw new Error('Remote name is required');
    if (!u)
        throw new Error('Remote URL is required');
    await git.addRemote(n, u);
    return true;
}
async function fetchRemote(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const res = await git.fetch(['--all']);
    return JSON.stringify(res, null, 2);
}
async function getGitAuthor() {
    const git = (0, simple_git_1.simpleGit)();
    const name = (await git.raw(['config', 'user.name'])).trim();
    const email = (await git.raw(['config', 'user.email'])).trim();
    return { name, email };
}
async function setGitAuthor(name, email) {
    const git = (0, simple_git_1.simpleGit)();
    const n = (name || '').trim();
    const e = (email || '').trim();
    if (!n)
        throw new Error('name is required');
    if (!e)
        throw new Error('email is required');
    await git.raw(['config', '--global', 'user.name', n]);
    await git.raw(['config', '--global', 'user.email', e]);
    return true;
}
async function pullRemote(repoPath, mode) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    if (mode === 'rebase') {
        const res = await git.pull(['--rebase']);
        return JSON.stringify(res, null, 2);
    }
    const res = await git.pull();
    return JSON.stringify(res, null, 2);
}
async function pushRemote(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const res = await git.push();
    return JSON.stringify(res, null, 2);
}
async function listStashes(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const res = await git.stashList();
    return res.all.map((s) => {
        const anyS = s;
        const byIndex = typeof anyS.index === 'number' ? anyS.index : undefined;
        const m = typeof anyS.refs === 'string' ? /stash@\{(\d+)\}/.exec(anyS.refs) : null;
        const parsed = m ? Number(m[1]) : undefined;
        return { index: byIndex ?? parsed ?? 0, message: s.message };
    });
}
async function getGitDir(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const gd = (await git.raw(['rev-parse', '--git-dir'])).trim();
    if (!gd)
        throw new Error('Unable to resolve .git dir');
    return (0, node_path_1.isAbsolute)(gd) ? gd : (0, node_path_1.resolve)(repoPath, gd);
}
function safeReadText(filePath) {
    try {
        if (!(0, node_fs_1.existsSync)(filePath))
            return null;
        return (0, node_fs_1.readFileSync)(filePath, 'utf8').trim();
    }
    catch {
        return null;
    }
}
async function getRebaseStatus(repoPath) {
    const gitDir = await getGitDir(repoPath);
    const applyDir = (0, node_path_1.resolve)(gitDir, 'rebase-apply');
    const mergeDir = (0, node_path_1.resolve)(gitDir, 'rebase-merge');
    const hasApply = (0, node_fs_1.existsSync)(applyDir);
    const hasMerge = (0, node_fs_1.existsSync)(mergeDir);
    if (!hasApply && !hasMerge) {
        return { inProgress: false, type: null, headName: null, onto: null, step: null, total: null };
    }
    const type = hasMerge ? 'rebase-merge' : 'rebase-apply';
    const base = hasMerge ? mergeDir : applyDir;
    const headName = safeReadText((0, node_path_1.resolve)(base, 'head-name'));
    const onto = safeReadText((0, node_path_1.resolve)(base, 'onto'));
    const stepRaw = safeReadText((0, node_path_1.resolve)(base, 'msgnum'));
    const totalRaw = safeReadText((0, node_path_1.resolve)(base, 'end'));
    const step = stepRaw && !Number.isNaN(Number(stepRaw)) ? Number(stepRaw) : null;
    const total = totalRaw && !Number.isNaN(Number(totalRaw)) ? Number(totalRaw) : null;
    return { inProgress: true, type, headName, onto, step, total };
}
async function rebaseAction(repoPath, action) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    return await git.raw(['rebase', `--${action}`]);
}
const dbHandles = new Map();
function getDefaultDbPath() {
    return (0, node_path_1.resolve)(electron_1.app.getPath('userData'), 'devxflow.db');
}
function getOrOpenDb(dbPath) {
    const p = dbPath.trim() || getDefaultDbPath();
    const existing = dbHandles.get(p);
    if (existing)
        return { path: p, db: existing };
    const db = new better_sqlite3_1.default(p);
    db.pragma('journal_mode = WAL');
    dbHandles.set(p, db);
    return { path: p, db };
}
function closeDb(dbPath) {
    const p = dbPath.trim() || getDefaultDbPath();
    const db = dbHandles.get(p);
    if (db) {
        db.close();
        dbHandles.delete(p);
    }
    return true;
}
async function saveStash(repoPath, message) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const msg = message.trim() || 'WIP';
    const out = await git.stash(['push', '-m', msg]);
    return String(out);
}
async function popStash(repoPath, index) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const args = ['pop'];
    if (typeof index === 'number')
        args.push(`stash@{${index}}`);
    const out = await git.stash(args);
    return String(out);
}
async function applyStash(repoPath, index) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const args = ['apply'];
    if (typeof index === 'number')
        args.push(`stash@{${index}}`);
    const out = await git.stash(args);
    return String(out);
}
async function dropStash(repoPath, index) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const args = ['drop'];
    if (typeof index === 'number')
        args.push(`stash@{${index}}`);
    const out = await git.stash(args);
    return String(out);
}
async function stageAll(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    await git.add('.');
}
async function initRepo(repoPath) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    await git.init();
}
async function createBranch(repoPath, branch) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const name = (branch || '').trim();
    if (!name)
        throw new Error('branch is required');
    await git.checkoutLocalBranch(name);
}
async function switchBranch(repoPath, branch) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    await git.checkout(branch);
}
async function deleteBranch(repoPath, branch) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const name = (branch || '').trim();
    if (!name)
        throw new Error('branch is required');
    await git.deleteLocalBranch(name, true);
}
async function mergeBranch(repoPath, branch) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    await git.merge([branch, '--no-ff', '-m', `Merge ${branch}`]);
}
async function pushBranch(repoPath, branch) {
    const git = (0, simple_git_1.simpleGit)({ baseDir: repoPath });
    const res = await git.push('origin', branch);
    return JSON.stringify(res, null, 2);
}
async function runTerminal(repoPath, command) {
    const cmd = command.trim();
    if (!cmd)
        throw new Error('command is required');
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'cmd.exe' : 'sh';
    const shellArgs = isWin ? ['/d', '/s', '/c', cmd] : ['-lc', cmd];
    return await new Promise((resolve) => {
        const child = (0, node_child_process_1.spawn)(shell, shellArgs, {
            cwd: repoPath,
            windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        const cap = (s) => (s.length > 200_000 ? s.slice(0, 200_000) + '\n…(truncated)…\n' : s);
        const timer = setTimeout(() => {
            try {
                child.kill();
            }
            catch {
                // ignore
            }
            resolve({ code: null, stdout: cap(stdout), stderr: cap(stderr + '\n(TIMEOUT)\n') });
        }, 30_000);
        child.stdout?.on('data', (d) => {
            stdout += d.toString();
        });
        child.stderr?.on('data', (d) => {
            stderr += d.toString();
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ code, stdout: cap(stdout), stderr: cap(stderr) });
        });
        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({ code: null, stdout: cap(stdout), stderr: cap(stderr + String(err)) });
        });
    });
}
function getTerminalHistoryPath() {
    return (0, node_path_1.resolve)((0, node_os_1.homedir)(), '.git_helper_terminal_history.json');
}
function readTerminalHistory() {
    const p = getTerminalHistoryPath();
    try {
        if (!(0, node_fs_1.existsSync)(p))
            return [];
        const raw = (0, node_fs_1.readFileSync)(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((v) => typeof v === 'string').slice(0, 200);
    }
    catch {
        return [];
    }
}
function writeTerminalHistory(items) {
    const p = getTerminalHistoryPath();
    const normalized = items
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .slice(0, 200);
    (0, node_fs_1.writeFileSync)(p, JSON.stringify(normalized, null, 2), 'utf8');
    return true;
}
function addTerminalHistoryItem(command) {
    const c = (command || '').trim();
    if (!c)
        return true;
    const current = readTerminalHistory();
    const next = [c, ...current.filter((x) => x !== c)];
    return writeTerminalHistory(next);
}
function detectProjectType(repoPath) {
    const has = (...parts) => (0, node_fs_1.existsSync)((0, node_path_1.resolve)(repoPath, ...parts));
    if (has('artisan') || has('composer.json'))
        return 'Laravel';
    if (has('package.json'))
        return 'Node.js';
    if (has('pyproject.toml') || has('requirements.txt'))
        return 'Python';
    return 'General';
}
function getTerminalSuggestions(projectType) {
    switch (projectType) {
        case 'Laravel':
            return ['php artisan --version', 'php artisan migrate', 'php artisan route:list', 'php artisan config:cache', 'php artisan optimize', 'composer install'];
        case 'Node.js':
            return ['node -v', 'npm -v', 'npm install', 'npm run build', 'npm test', 'npm run dev'];
        case 'Python':
            return ['python --version', 'pip --version', 'pip install -r requirements.txt', 'python -m venv .venv', 'pytest'];
        default:
            return ['git status', 'git branch', 'git log --oneline -n 20', 'git fetch --all', 'git pull', 'git push'];
    }
}
function registerGitIpc() {
    electron_1.ipcMain.handle('app:open-external', async (_event, url) => {
        const u = (url || '').trim();
        if (!u)
            return false;
        await electron_1.shell.openExternal(u);
        return true;
    });
    electron_1.ipcMain.handle('repo:pick', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select a Git repository',
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle('repo:status', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getStatusSummary(repoPath);
    });
    electron_1.ipcMain.handle('repo:changes', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getChanges(repoPath);
    });
    electron_1.ipcMain.handle('repo:stage', async (_event, repoPath, paths) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await stageFiles(repoPath, paths);
        return true;
    });
    electron_1.ipcMain.handle('repo:unstage', async (_event, repoPath, paths) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await unstageFiles(repoPath, paths);
        return true;
    });
    electron_1.ipcMain.handle('repo:commit', async (_event, repoPath, message) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await commit(repoPath, message);
        return true;
    });
    electron_1.ipcMain.handle('repo:diff', async (_event, repoPath, filePath, mode) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getDiff(repoPath, filePath, mode);
    });
    electron_1.ipcMain.handle('repo:log', async (_event, repoPath, maxCount) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        const count = Number.isFinite(maxCount) ? Math.max(1, Math.min(200, maxCount)) : 50;
        return await getLog(repoPath, count);
    });
    electron_1.ipcMain.handle('repo:log-graph', async (_event, repoPath, maxCount) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getLogGraph(repoPath, maxCount);
    });
    electron_1.ipcMain.handle('repo:commit-details', async (_event, repoPath, hash) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getCommitDetails(repoPath, hash);
    });
    electron_1.ipcMain.handle('repo:remotes', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await listRemotes(repoPath);
    });
    electron_1.ipcMain.handle('repo:add-remote', async (_event, repoPath, name, url) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await addRemote(repoPath, name, url);
        return true;
    });
    electron_1.ipcMain.handle('git:author-get', async () => {
        return await getGitAuthor();
    });
    electron_1.ipcMain.handle('git:author-set', async (_event, name, email) => {
        return await setGitAuthor(name, email);
    });
    electron_1.ipcMain.handle('repo:fetch', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await fetchRemote(repoPath);
    });
    electron_1.ipcMain.handle('repo:pull', async (_event, repoPath, mode) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await pullRemote(repoPath, mode);
    });
    electron_1.ipcMain.handle('repo:push', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await pushRemote(repoPath);
    });
    electron_1.ipcMain.handle('repo:stash-list', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await listStashes(repoPath);
    });
    electron_1.ipcMain.handle('repo:stash-save', async (_event, repoPath, message) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await saveStash(repoPath, message);
    });
    electron_1.ipcMain.handle('repo:stash-pop', async (_event, repoPath, index) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await popStash(repoPath, index);
    });
    electron_1.ipcMain.handle('repo:stash-apply', async (_event, repoPath, index) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await applyStash(repoPath, index);
    });
    electron_1.ipcMain.handle('repo:stash-drop', async (_event, repoPath, index) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await dropStash(repoPath, index);
    });
    electron_1.ipcMain.handle('terminal:run', async (_event, repoPath, command) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        addTerminalHistoryItem(command);
        return await runTerminal(repoPath, command);
    });
    electron_1.ipcMain.handle('terminal:history-get', async () => {
        return readTerminalHistory();
    });
    electron_1.ipcMain.handle('terminal:history-add', async (_event, command) => {
        return addTerminalHistoryItem(command);
    });
    electron_1.ipcMain.handle('terminal:detect-project', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return detectProjectType(repoPath);
    });
    electron_1.ipcMain.handle('terminal:suggestions', async (_event, projectType) => {
        return getTerminalSuggestions(projectType);
    });
    electron_1.ipcMain.handle('app:info', async () => {
        return {
            platform: process.platform,
            arch: process.arch,
            versions: process.versions,
        };
    });
    electron_1.ipcMain.handle('repo:conflicts', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getConflicts(repoPath);
    });
    electron_1.ipcMain.handle('repo:conflict-version', async (_event, repoPath, filePath, stage) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getConflictVersion(repoPath, filePath, stage);
    });
    electron_1.ipcMain.handle('repo:rebase-status', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await getRebaseStatus(repoPath);
    });
    electron_1.ipcMain.handle('repo:rebase-continue', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await rebaseAction(repoPath, 'continue');
    });
    electron_1.ipcMain.handle('repo:rebase-skip', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await rebaseAction(repoPath, 'skip');
    });
    electron_1.ipcMain.handle('repo:rebase-abort', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await rebaseAction(repoPath, 'abort');
    });
    electron_1.ipcMain.handle('repo:stage-all', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await stageAll(repoPath);
        return true;
    });
    electron_1.ipcMain.handle('repo:init', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await initRepo(repoPath);
        return true;
    });
    electron_1.ipcMain.handle('repo:create-branch', async (_event, repoPath, branch) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await createBranch(repoPath, branch);
        return true;
    });
    electron_1.ipcMain.handle('repo:switch-branch', async (_event, repoPath, branch) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await switchBranch(repoPath, branch);
        return true;
    });
    electron_1.ipcMain.handle('repo:delete-branch', async (_event, repoPath, branch) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await deleteBranch(repoPath, branch);
        return true;
    });
    electron_1.ipcMain.handle('repo:merge', async (_event, repoPath, branch) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        await mergeBranch(repoPath, branch);
        return true;
    });
    electron_1.ipcMain.handle('repo:push-branch', async (_event, repoPath, branch) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await pushBranch(repoPath, branch);
    });
    // Merge conflict resolution IPC handlers
    electron_1.ipcMain.handle('repo:parse-conflict', async (_event, repoPath, filePath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await parseConflictFile(repoPath, filePath);
    });
    electron_1.ipcMain.handle('repo:resolve-conflict', async (_event, repoPath, filePath, side) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await resolveConflict(repoPath, filePath, side);
    });
    electron_1.ipcMain.handle('repo:mark-resolved', async (_event, repoPath, filePath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await markResolved(repoPath, filePath);
    });
    electron_1.ipcMain.handle('repo:open-external', async (_event, filePath) => {
        if (!filePath)
            throw new Error('filePath is required');
        try {
            await electron_1.shell.openPath(filePath);
            return true;
        }
        catch {
            return false;
        }
    });
    // Interactive rebase IPC handlers
    electron_1.ipcMain.handle('rebase:load-commits', async (_event, repoPath, baseCommit) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await loadRebaseCommits(repoPath, baseCommit);
    });
    electron_1.ipcMain.handle('rebase:start', async (_event, repoPath, todoItems) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await startInteractiveRebase(repoPath, todoItems);
    });
    electron_1.ipcMain.handle('rebase:write-todo', async (_event, repoPath, todoItems) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        return await writeRebaseTodoFile(repoPath, todoItems);
    });
}
