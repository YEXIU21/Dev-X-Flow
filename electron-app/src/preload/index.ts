import { contextBridge, ipcRenderer } from 'electron'

type RepoStatusSummary = {
  branch: string
  staged: number
  modified: number
  created: number
  deleted: number
  renamed: number
  conflicted: number
  ahead: number
  behind: number
}

type RepoChange = {
  path: string
  index: string
  working_dir: string
}

type CommitItem = {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

type RemoteItem = {
  name: string
  fetch: string
  push: string
}

type StashItem = {
  index: number
  message: string
}

type TerminalResult = {
  code: number | null
  stdout: string
  stderr: string
}

type AppInfo = {
  platform: string
  arch: string
  versions: Record<string, string>
}

type RebaseStatus = {
  inProgress: boolean
  type: 'rebase-apply' | 'rebase-merge' | null
  headName: string | null
  onto: string | null
  step: number | null
  total: number | null
}

type DbQueryResult = {
  rows: unknown[]
}

contextBridge.exposeInMainWorld('devxflow', {
  version: '0.1.0',
  pickRepo: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('repo:pick')
  },
  getRepoStatus: async (repoPath: string): Promise<RepoStatusSummary> => {
    return await ipcRenderer.invoke('repo:status', repoPath)
  },
  getRepoChanges: async (repoPath: string): Promise<RepoChange[]> => {
    return await ipcRenderer.invoke('repo:changes', repoPath)
  },
  stageFiles: async (repoPath: string, paths: string[]): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:stage', repoPath, paths)
  },
  unstageFiles: async (repoPath: string, paths: string[]): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:unstage', repoPath, paths)
  },
  commit: async (repoPath: string, message: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:commit', repoPath, message)
  },
  getDiff: async (repoPath: string, filePath: string, mode: 'staged' | 'unstaged'): Promise<string> => {
    return await ipcRenderer.invoke('repo:diff', repoPath, filePath, mode)
  },
  generateCommitMessage: async (repoPath: string): Promise<string> => {
    return await ipcRenderer.invoke('ai:commit-message', repoPath)
  },
  getLog: async (repoPath: string, maxCount: number): Promise<CommitItem[]> => {
    return await ipcRenderer.invoke('repo:log', repoPath, maxCount)
  },
  getCommitDetails: async (repoPath: string, hash: string): Promise<string> => {
    return await ipcRenderer.invoke('repo:commit-details', repoPath, hash)
  },
  getRemotes: async (repoPath: string): Promise<RemoteItem[]> => {
    return await ipcRenderer.invoke('repo:remotes', repoPath)
  },
  addRemote: async (repoPath: string, name: string, url: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:add-remote', repoPath, name, url)
  },
  fetch: async (repoPath: string): Promise<string> => {
    return await ipcRenderer.invoke('repo:fetch', repoPath)
  },
  pull: async (repoPath: string, mode: 'merge' | 'rebase'): Promise<string> => {
    return await ipcRenderer.invoke('repo:pull', repoPath, mode)
  },
  push: async (repoPath: string, branch?: string): Promise<string> => {
    if (branch) {
      return await ipcRenderer.invoke('repo:push-branch', repoPath, branch)
    }
    return await ipcRenderer.invoke('repo:push', repoPath)
  },
  stageAll: async (repoPath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:stage-all', repoPath)
  },
  switchBranch: async (repoPath: string, branch: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:switch-branch', repoPath, branch)
  },
  merge: async (repoPath: string, branch: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:merge', repoPath, branch)
  },
  getStashes: async (repoPath: string): Promise<StashItem[]> => {
    return await ipcRenderer.invoke('repo:stash-list', repoPath)
  },
  stashSave: async (repoPath: string, message: string): Promise<string> => {
    return await ipcRenderer.invoke('repo:stash-save', repoPath, message)
  },
  stashPop: async (repoPath: string, index?: number): Promise<string> => {
    return await ipcRenderer.invoke('repo:stash-pop', repoPath, index)
  },
  stashApply: async (repoPath: string, index?: number): Promise<string> => {
    return await ipcRenderer.invoke('repo:stash-apply', repoPath, index)
  },
  stashDrop: async (repoPath: string, index?: number): Promise<string> => {
    return await ipcRenderer.invoke('repo:stash-drop', repoPath, index)
  },
  runTerminal: async (repoPath: string, command: string): Promise<TerminalResult> => {
    return await ipcRenderer.invoke('terminal:run', repoPath, command)
  },
  getAppInfo: async (): Promise<AppInfo> => {
    return await ipcRenderer.invoke('app:info')
  },
  getConflicts: async (repoPath: string): Promise<string[]> => {
    return await ipcRenderer.invoke('repo:conflicts', repoPath)
  },
  getConflictVersion: async (repoPath: string, filePath: string, stage: 1 | 2 | 3): Promise<string> => {
    return await ipcRenderer.invoke('repo:conflict-version', repoPath, filePath, stage)
  },
  getRebaseStatus: async (repoPath: string): Promise<RebaseStatus> => {
    return await ipcRenderer.invoke('repo:rebase-status', repoPath)
  },
  rebaseContinue: async (repoPath: string): Promise<string> => {
    return await ipcRenderer.invoke('repo:rebase-continue', repoPath)
  },
  rebaseSkip: async (repoPath: string): Promise<string> => {
    return await ipcRenderer.invoke('repo:rebase-skip', repoPath)
  },
  rebaseAbort: async (repoPath: string): Promise<string> => {
    return await ipcRenderer.invoke('repo:rebase-abort', repoPath)
  },
  getDefaultDbPath: async (): Promise<string> => {
    return await ipcRenderer.invoke('db:default-path')
  },
  pickDb: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('db:pick')
  },
  connectDb: async (dbPath: string): Promise<{ ok: boolean; path: string }> => {
    return await ipcRenderer.invoke('db:connect', dbPath)
  },
  queryDb: async (dbPath: string, sql: string): Promise<DbQueryResult> => {
    return await ipcRenderer.invoke('db:query', dbPath, sql)
  },
  execDb: async (dbPath: string, sql: string): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke('db:exec', dbPath, sql)
  },
  closeDb: async (dbPath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('db:close', dbPath)
  },
})
