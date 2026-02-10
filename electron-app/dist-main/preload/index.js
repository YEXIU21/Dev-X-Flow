import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('devxflow', {
    version: '0.1.0',
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
});
