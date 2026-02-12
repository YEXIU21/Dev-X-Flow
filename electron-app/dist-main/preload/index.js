import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('devxflow', {
    version: '0.1.0',
    openExternal: async (url) => {
        return await ipcRenderer.invoke('app:open-external', url);
    },
    pickRepo: async () => {
        return await ipcRenderer.invoke('repo:pick');
    },
    getRepoStatus: async (repoPath) => {
        return await ipcRenderer.invoke('repo:status', repoPath);
    },
    getRepoChanges: async (repoPath) => {
        return await ipcRenderer.invoke('repo:changes', repoPath);
    },
    stageFiles: async (repoPath, paths) => {
        return await ipcRenderer.invoke('repo:stage', repoPath, paths);
    },
    unstageFiles: async (repoPath, paths) => {
        return await ipcRenderer.invoke('repo:unstage', repoPath, paths);
    },
    commit: async (repoPath, message) => {
        return await ipcRenderer.invoke('repo:commit', repoPath, message);
    },
    getDiff: async (repoPath, filePath, mode) => {
        return await ipcRenderer.invoke('repo:diff', repoPath, filePath, mode);
    },
    generateCommitMessage: async (repoPath) => {
        return await ipcRenderer.invoke('ai:commit-message', repoPath);
    },
    getLog: async (repoPath, maxCount) => {
        return await ipcRenderer.invoke('repo:log', repoPath, maxCount);
    },
    getCommitDetails: async (repoPath, hash) => {
        return await ipcRenderer.invoke('repo:commit-details', repoPath, hash);
    },
    getRemotes: async (repoPath) => {
        return await ipcRenderer.invoke('repo:remotes', repoPath);
    },
    addRemote: async (repoPath, name, url) => {
        return await ipcRenderer.invoke('repo:add-remote', repoPath, name, url);
    },
    fetch: async (repoPath) => {
        return await ipcRenderer.invoke('repo:fetch', repoPath);
    },
    pull: async (repoPath, mode) => {
        return await ipcRenderer.invoke('repo:pull', repoPath, mode);
    },
    push: async (repoPath, branch) => {
        if (branch) {
            return await ipcRenderer.invoke('repo:push-branch', repoPath, branch);
        }
        return await ipcRenderer.invoke('repo:push', repoPath);
    },
    stageAll: async (repoPath) => {
        return await ipcRenderer.invoke('repo:stage-all', repoPath);
    },
    switchBranch: async (repoPath, branch) => {
        return await ipcRenderer.invoke('repo:switch-branch', repoPath, branch);
    },
    merge: async (repoPath, branch) => {
        return await ipcRenderer.invoke('repo:merge', repoPath, branch);
    },
    getGitAuthor: async () => {
        return await ipcRenderer.invoke('git:author-get');
    },
    setGitAuthor: async (name, email) => {
        return await ipcRenderer.invoke('git:author-set', name, email);
    },
    getStashes: async (repoPath) => {
        return await ipcRenderer.invoke('repo:stash-list', repoPath);
    },
    stashSave: async (repoPath, message) => {
        return await ipcRenderer.invoke('repo:stash-save', repoPath, message);
    },
    stashPop: async (repoPath, index) => {
        return await ipcRenderer.invoke('repo:stash-pop', repoPath, index);
    },
    stashApply: async (repoPath, index) => {
        return await ipcRenderer.invoke('repo:stash-apply', repoPath, index);
    },
    stashDrop: async (repoPath, index) => {
        return await ipcRenderer.invoke('repo:stash-drop', repoPath, index);
    },
    runTerminal: async (repoPath, command) => {
        return await ipcRenderer.invoke('terminal:run', repoPath, command);
    },
    getTerminalHistory: async () => {
        return await ipcRenderer.invoke('terminal:history-get');
    },
    addTerminalHistory: async (command) => {
        return await ipcRenderer.invoke('terminal:history-add', command);
    },
    detectProjectType: async (repoPath) => {
        return await ipcRenderer.invoke('terminal:detect-project', repoPath);
    },
    getTerminalSuggestions: async (projectType) => {
        return await ipcRenderer.invoke('terminal:suggestions', projectType);
    },
    getAppInfo: async () => {
        return await ipcRenderer.invoke('app:info');
    },
    getConflicts: async (repoPath) => {
        return await ipcRenderer.invoke('repo:conflicts', repoPath);
    },
    getConflictVersion: async (repoPath, filePath, stage) => {
        return await ipcRenderer.invoke('repo:conflict-version', repoPath, filePath, stage);
    },
    getRebaseStatus: async (repoPath) => {
        return await ipcRenderer.invoke('repo:rebase-status', repoPath);
    },
    rebaseContinue: async (repoPath) => {
        return await ipcRenderer.invoke('repo:rebase-continue', repoPath);
    },
    rebaseSkip: async (repoPath) => {
        return await ipcRenderer.invoke('repo:rebase-skip', repoPath);
    },
    rebaseAbort: async (repoPath) => {
        return await ipcRenderer.invoke('repo:rebase-abort', repoPath);
    },
    getDefaultDbPath: async () => {
        return await ipcRenderer.invoke('db:default-path');
    },
    pickDb: async () => {
        return await ipcRenderer.invoke('db:pick');
    },
    connectDb: async (dbPath) => {
        return await ipcRenderer.invoke('db:connect', dbPath);
    },
    queryDb: async (dbPath, sql) => {
        return await ipcRenderer.invoke('db:query', dbPath, sql);
    },
    execDb: async (dbPath, sql) => {
        return await ipcRenderer.invoke('db:exec', dbPath, sql);
    },
    closeDb: async (dbPath) => {
        return await ipcRenderer.invoke('db:close', dbPath);
    },
    // Debug / Laravel Log Monitor APIs
    debugDetectLog: async (repoPath) => {
        return await ipcRenderer.invoke('debug:detect-log', repoPath);
    },
    debugReadLog: async (repoPath) => {
        return await ipcRenderer.invoke('debug:read-log', repoPath);
    },
    debugWatchStart: async (repoPath) => {
        return await ipcRenderer.invoke('debug:watch-start', repoPath);
    },
    debugWatchStop: async (repoPath) => {
        return await ipcRenderer.invoke('debug:watch-stop', repoPath);
    },
    debugOpenLog: async (filePath) => {
        return await ipcRenderer.invoke('debug:open-log', filePath);
    },
    onDebugUpdate: (callback) => {
        const handler = (_event, result) => callback(result);
        ipcRenderer.on('debug:update', handler);
        return () => ipcRenderer.removeListener('debug:update', handler);
    },
    // Merge conflict resolution APIs
    parseConflict: async (repoPath, filePath) => {
        return await ipcRenderer.invoke('repo:parse-conflict', repoPath, filePath);
    },
    resolveConflict: async (repoPath, filePath, side) => {
        return await ipcRenderer.invoke('repo:resolve-conflict', repoPath, filePath, side);
    },
    markResolved: async (repoPath, filePath) => {
        return await ipcRenderer.invoke('repo:mark-resolved', repoPath, filePath);
    },
    openFileExternal: async (filePath) => {
        return await ipcRenderer.invoke('repo:open-external', filePath);
    },
    // Interactive rebase APIs
    loadRebaseCommits: async (repoPath, baseCommit) => {
        return await ipcRenderer.invoke('rebase:load-commits', repoPath, baseCommit);
    },
    startInteractiveRebase: async (repoPath, todoItems) => {
        return await ipcRenderer.invoke('rebase:start', repoPath, todoItems);
    },
    writeRebaseTodo: async (repoPath, todoItems) => {
        return await ipcRenderer.invoke('rebase:write-todo', repoPath, todoItems);
    },
    // Database multi-engine APIs
    dbConnect: async (config) => {
        return await ipcRenderer.invoke('db:connect', config);
    },
    dbDisconnect: async (key) => {
        return await ipcRenderer.invoke('db:disconnect', key);
    },
    dbQuery: async (key, sql) => {
        return await ipcRenderer.invoke('db:query', key, sql);
    },
    dbExecute: async (key, sql) => {
        return await ipcRenderer.invoke('db:execute', key, sql);
    },
    dbListTables: async (key) => {
        return await ipcRenderer.invoke('db:list-tables', key);
    },
    dbListDatabases: async (key) => {
        return await ipcRenderer.invoke('db:list-databases', key);
    },
    dbTableInfo: async (key, tableName) => {
        return await ipcRenderer.invoke('db:table-info', key, tableName);
    },
    dbPickSqlite: async () => {
        return await ipcRenderer.invoke('db:pick-sqlite');
    },
    dbTestConnection: async (config) => {
        return await ipcRenderer.invoke('db:test-connection', config);
    },
});
