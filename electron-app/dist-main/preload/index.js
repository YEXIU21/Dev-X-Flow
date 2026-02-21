"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('devxflow', {
    version: '0.1.0',
    openExternal: async (url) => {
        return await electron_1.ipcRenderer.invoke('app:open-external', url);
    },
    pickRepo: async () => {
        return await electron_1.ipcRenderer.invoke('repo:pick');
    },
    getRepoStatus: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:status', repoPath);
    },
    getRepoChanges: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:changes', repoPath);
    },
    stageFiles: async (repoPath, paths) => {
        return await electron_1.ipcRenderer.invoke('repo:stage', repoPath, paths);
    },
    unstageFiles: async (repoPath, paths) => {
        return await electron_1.ipcRenderer.invoke('repo:unstage', repoPath, paths);
    },
    commit: async (repoPath, message) => {
        return await electron_1.ipcRenderer.invoke('repo:commit', repoPath, message);
    },
    getDiff: async (repoPath, filePath, mode) => {
        return await electron_1.ipcRenderer.invoke('repo:diff', repoPath, filePath, mode);
    },
    generateCommitMessage: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('ai:commit-message', repoPath);
    },
    getLog: async (repoPath, maxCount) => {
        return await electron_1.ipcRenderer.invoke('repo:log', repoPath, maxCount);
    },
    getLogGraph: async (repoPath, maxCount) => {
        return await electron_1.ipcRenderer.invoke('repo:log-graph', repoPath, maxCount);
    },
    getCommitDetails: async (repoPath, hash) => {
        return await electron_1.ipcRenderer.invoke('repo:commit-details', repoPath, hash);
    },
    getRemotes: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:remotes', repoPath);
    },
    addRemote: async (repoPath, name, url) => {
        return await electron_1.ipcRenderer.invoke('repo:add-remote', repoPath, name, url);
    },
    fetch: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:fetch', repoPath);
    },
    pull: async (repoPath, mode) => {
        return await electron_1.ipcRenderer.invoke('repo:pull', repoPath, mode);
    },
    push: async (repoPath, branch) => {
        if (branch) {
            return await electron_1.ipcRenderer.invoke('repo:push-branch', repoPath, branch);
        }
        return await electron_1.ipcRenderer.invoke('repo:push', repoPath);
    },
    stageAll: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:stage-all', repoPath);
    },
    initRepo: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:init', repoPath);
    },
    createBranch: async (repoPath, branch) => {
        return await electron_1.ipcRenderer.invoke('repo:create-branch', repoPath, branch);
    },
    switchBranch: async (repoPath, branch) => {
        return await electron_1.ipcRenderer.invoke('repo:switch-branch', repoPath, branch);
    },
    deleteBranch: async (repoPath, branch) => {
        return await electron_1.ipcRenderer.invoke('repo:delete-branch', repoPath, branch);
    },
    merge: async (repoPath, branch) => {
        return await electron_1.ipcRenderer.invoke('repo:merge', repoPath, branch);
    },
    getGitAuthor: async () => {
        return await electron_1.ipcRenderer.invoke('git:author-get');
    },
    setGitAuthor: async (name, email) => {
        return await electron_1.ipcRenderer.invoke('git:author-set', name, email);
    },
    getStashes: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:stash-list', repoPath);
    },
    stashSave: async (repoPath, message) => {
        return await electron_1.ipcRenderer.invoke('repo:stash-save', repoPath, message);
    },
    stashPop: async (repoPath, index) => {
        return await electron_1.ipcRenderer.invoke('repo:stash-pop', repoPath, index);
    },
    stashApply: async (repoPath, index) => {
        return await electron_1.ipcRenderer.invoke('repo:stash-apply', repoPath, index);
    },
    stashDrop: async (repoPath, index) => {
        return await electron_1.ipcRenderer.invoke('repo:stash-drop', repoPath, index);
    },
    runTerminal: async (repoPath, command) => {
        return await electron_1.ipcRenderer.invoke('terminal:run', repoPath, command);
    },
    getTerminalHistory: async () => {
        return await electron_1.ipcRenderer.invoke('terminal:history-get');
    },
    addTerminalHistory: async (command) => {
        return await electron_1.ipcRenderer.invoke('terminal:history-add', command);
    },
    detectProjectType: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('terminal:detect-project', repoPath);
    },
    getTerminalSuggestions: async (projectType) => {
        return await electron_1.ipcRenderer.invoke('terminal:suggestions', projectType);
    },
    getAppInfo: async () => {
        return await electron_1.ipcRenderer.invoke('app:info');
    },
    getConflicts: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:conflicts', repoPath);
    },
    getConflictVersion: async (repoPath, filePath, stage) => {
        return await electron_1.ipcRenderer.invoke('repo:conflict-version', repoPath, filePath, stage);
    },
    getRebaseStatus: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:rebase-status', repoPath);
    },
    rebaseContinue: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:rebase-continue', repoPath);
    },
    rebaseSkip: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:rebase-skip', repoPath);
    },
    rebaseAbort: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('repo:rebase-abort', repoPath);
    },
    getDefaultDbPath: async () => {
        return await electron_1.ipcRenderer.invoke('db:default-path');
    },
    pickDb: async () => {
        return await electron_1.ipcRenderer.invoke('db:pick');
    },
    connectDb: async (dbPath) => {
        return await electron_1.ipcRenderer.invoke('db:connect', dbPath);
    },
    queryDb: async (dbPath, sql) => {
        return await electron_1.ipcRenderer.invoke('db:query', dbPath, sql);
    },
    execDb: async (dbPath, sql) => {
        return await electron_1.ipcRenderer.invoke('db:exec', dbPath, sql);
    },
    closeDb: async (dbPath) => {
        return await electron_1.ipcRenderer.invoke('db:close', dbPath);
    },
    // Debug / Laravel Log Monitor APIs
    debugDetectLog: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('debug:detect-log', repoPath);
    },
    debugReadLog: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('debug:read-log', repoPath);
    },
    debugWatchStart: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('debug:watch-start', repoPath);
    },
    debugWatchStop: async (repoPath) => {
        return await electron_1.ipcRenderer.invoke('debug:watch-stop', repoPath);
    },
    debugOpenLog: async (filePath) => {
        return await electron_1.ipcRenderer.invoke('debug:open-log', filePath);
    },
    onDebugUpdate: (callback) => {
        const handler = (_event, result) => callback(result);
        electron_1.ipcRenderer.on('debug:update', handler);
        return () => electron_1.ipcRenderer.removeListener('debug:update', handler);
    },
    // Merge conflict resolution APIs
    parseConflict: async (repoPath, filePath) => {
        return await electron_1.ipcRenderer.invoke('repo:parse-conflict', repoPath, filePath);
    },
    resolveConflict: async (repoPath, filePath, side) => {
        return await electron_1.ipcRenderer.invoke('repo:resolve-conflict', repoPath, filePath, side);
    },
    markResolved: async (repoPath, filePath) => {
        return await electron_1.ipcRenderer.invoke('repo:mark-resolved', repoPath, filePath);
    },
    openFileExternal: async (filePath) => {
        return await electron_1.ipcRenderer.invoke('repo:open-external', filePath);
    },
    // Interactive rebase APIs
    loadRebaseCommits: async (repoPath, baseCommit) => {
        return await electron_1.ipcRenderer.invoke('rebase:load-commits', repoPath, baseCommit);
    },
    startInteractiveRebase: async (repoPath, todoItems) => {
        return await electron_1.ipcRenderer.invoke('rebase:start', repoPath, todoItems);
    },
    writeRebaseTodo: async (repoPath, todoItems) => {
        return await electron_1.ipcRenderer.invoke('rebase:write-todo', repoPath, todoItems);
    },
    // Database multi-engine APIs
    dbConnect: async (config) => {
        return await electron_1.ipcRenderer.invoke('db:connect', config);
    },
    dbDisconnect: async (key) => {
        return await electron_1.ipcRenderer.invoke('db:disconnect', key);
    },
    dbQuery: async (key, sql) => {
        return await electron_1.ipcRenderer.invoke('db:query', key, sql);
    },
    dbExecute: async (key, sql) => {
        return await electron_1.ipcRenderer.invoke('db:execute', key, sql);
    },
    dbListTables: async (key) => {
        return await electron_1.ipcRenderer.invoke('db:list-tables', key);
    },
    dbListDatabases: async (key) => {
        return await electron_1.ipcRenderer.invoke('db:list-databases', key);
    },
    dbTableInfo: async (key, tableName) => {
        return await electron_1.ipcRenderer.invoke('db:table-info', key, tableName);
    },
    dbPickExportDir: async () => {
        return await electron_1.ipcRenderer.invoke('db:pick-export-dir');
    },
    dbExportToTxt: async (key, exportDir) => {
        return await electron_1.ipcRenderer.invoke('db:export-to-txt', key, exportDir);
    },
    dbPickSqlFile: async () => {
        return await electron_1.ipcRenderer.invoke('db:pick-sql-file');
    },
    dbScanSqlTables: async (sqlFilePath) => {
        return await electron_1.ipcRenderer.invoke('db:scan-sql-tables', sqlFilePath);
    },
    dbImportSql: async (key, sqlFilePath) => {
        return await electron_1.ipcRenderer.invoke('db:import-sql', key, sqlFilePath);
    },
    dbImportSqlSelective: async (key, sqlFilePath, tableNames) => {
        return await electron_1.ipcRenderer.invoke('db:import-sql-selective', key, sqlFilePath, tableNames);
    },
    dbPickSqlite: async () => {
        return await electron_1.ipcRenderer.invoke('db:pick-sqlite');
    },
    dbPickMysqlExe: async () => {
        return await electron_1.ipcRenderer.invoke('db:pick-mysql-exe');
    },
    dbDetectMysqlExe: async () => {
        return await electron_1.ipcRenderer.invoke('db:detect-mysql-exe');
    },
    dbTestConnection: async (config) => {
        return await electron_1.ipcRenderer.invoke('db:test-connection', config);
    },
});
