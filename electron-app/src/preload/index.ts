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

type ProjectType = 'Laravel' | 'Node.js' | 'Python' | 'General'

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

type LogLevel = 'error' | 'warning' | 'info' | 'debug' | 'timestamp' | 'other'

type LogLine = {
  text: string
  level: LogLevel
}

type LogSummary = {
  errors: number
  warnings: number
  info: number
  debug: number
  total: number
}

type LogResult = {
  lines: LogLine[]
  summary: LogSummary
  filePath: string | null
  truncated: boolean
}

type GitAuthor = {
  name: string
  email: string
}

contextBridge.exposeInMainWorld('devxflow', {
  version: '0.1.0',
  openExternal: async (url: string): Promise<boolean> => {
    return await ipcRenderer.invoke('app:open-external', url)
  },
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
  getLogGraph: async (repoPath: string, maxCount: number): Promise<string> => {
    return await ipcRenderer.invoke('repo:log-graph', repoPath, maxCount)
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
  initRepo: async (repoPath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:init', repoPath)
  },
  createBranch: async (repoPath: string, branch: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:create-branch', repoPath, branch)
  },
  switchBranch: async (repoPath: string, branch: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:switch-branch', repoPath, branch)
  },
  deleteBranch: async (repoPath: string, branch: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:delete-branch', repoPath, branch)
  },
  merge: async (repoPath: string, branch: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:merge', repoPath, branch)
  },
  getGitAuthor: async (): Promise<GitAuthor> => {
    return await ipcRenderer.invoke('git:author-get')
  },
  setGitAuthor: async (name: string, email: string): Promise<boolean> => {
    return await ipcRenderer.invoke('git:author-set', name, email)
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
  getTerminalHistory: async (): Promise<string[]> => {
    return await ipcRenderer.invoke('terminal:history-get')
  },
  addTerminalHistory: async (command: string): Promise<boolean> => {
    return await ipcRenderer.invoke('terminal:history-add', command)
  },
  detectProjectType: async (repoPath: string): Promise<ProjectType> => {
    return await ipcRenderer.invoke('terminal:detect-project', repoPath)
  },
  getTerminalSuggestions: async (projectType: ProjectType): Promise<string[]> => {
    return await ipcRenderer.invoke('terminal:suggestions', projectType)
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
  // Debug / Laravel Log Monitor APIs
  debugDetectLog: async (repoPath: string): Promise<string | null> => {
    return await ipcRenderer.invoke('debug:detect-log', repoPath)
  },
  debugReadLog: async (repoPath: string): Promise<LogResult> => {
    return await ipcRenderer.invoke('debug:read-log', repoPath)
  },
  debugWatchStart: async (repoPath: string): Promise<{ success: boolean; filePath: string | null }> => {
    return await ipcRenderer.invoke('debug:watch-start', repoPath)
  },
  debugWatchStop: async (repoPath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('debug:watch-stop', repoPath)
  },
  debugOpenLog: async (filePath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('debug:open-log', filePath)
  },
  onDebugUpdate: (callback: (result: LogResult) => void) => {
    const handler = (_event: unknown, result: LogResult) => callback(result)
    ipcRenderer.on('debug:update', handler)
    return () => ipcRenderer.removeListener('debug:update', handler)
  },
  // Merge conflict resolution APIs
  parseConflict: async (repoPath: string, filePath: string): Promise<{ base: string; ours: string; theirs: string }> => {
    return await ipcRenderer.invoke('repo:parse-conflict', repoPath, filePath)
  },
  resolveConflict: async (repoPath: string, filePath: string, side: 'ours' | 'theirs'): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:resolve-conflict', repoPath, filePath, side)
  },
  markResolved: async (repoPath: string, filePath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:mark-resolved', repoPath, filePath)
  },
  openFileExternal: async (filePath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('repo:open-external', filePath)
  },
  // Interactive rebase APIs
  loadRebaseCommits: async (repoPath: string, baseCommit?: string): Promise<{ action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'; hash: string; message: string }[]> => {
    return await ipcRenderer.invoke('rebase:load-commits', repoPath, baseCommit)
  },
  startInteractiveRebase: async (repoPath: string, todoItems: { action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'; hash: string; message: string }[]): Promise<string> => {
    return await ipcRenderer.invoke('rebase:start', repoPath, todoItems)
  },
  writeRebaseTodo: async (repoPath: string, todoItems: { action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'; hash: string; message: string }[]): Promise<boolean> => {
    return await ipcRenderer.invoke('rebase:write-todo', repoPath, todoItems)
  },
  // Database multi-engine APIs
  dbConnect: async (config: { engine: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'; config: Record<string, unknown> }): Promise<{ ok: boolean; key: string; error?: string }> => {
    return await ipcRenderer.invoke('db:connect', config)
  },
  dbDisconnect: async (key: string): Promise<boolean> => {
    return await ipcRenderer.invoke('db:disconnect', key)
  },
  dbQuery: async (key: string, sql: string): Promise<{ rows: unknown[]; fields?: Array<{ name: string; type: string }> }> => {
    return await ipcRenderer.invoke('db:query', key, sql)
  },
  dbExecute: async (key: string, sql: string): Promise<boolean> => {
    return await ipcRenderer.invoke('db:execute', key, sql)
  },
  dbListTables: async (key: string): Promise<string[]> => {
    return await ipcRenderer.invoke('db:list-tables', key)
  },
  dbListDatabases: async (key: string): Promise<string[]> => {
    return await ipcRenderer.invoke('db:list-databases', key)
  },
  dbTableInfo: async (key: string, tableName: string): Promise<unknown[]> => {
    return await ipcRenderer.invoke('db:table-info', key, tableName)
  },
  dbPickExportDir: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('db:pick-export-dir')
  },
  dbExportToTxt: async (key: string, exportDir: string): Promise<{ exported: number; files: string[] }> => {
    return await ipcRenderer.invoke('db:export-to-txt', key, exportDir)
  },
  dbPickSqlFile: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('db:pick-sql-file')
  },
  dbScanSqlTables: async (sqlFilePath: string): Promise<string[]> => {
    return await ipcRenderer.invoke('db:scan-sql-tables', sqlFilePath)
  },
  dbImportSql: async (key: string, sqlFilePath: string): Promise<{ success: boolean; tables: string[]; message: string }> => {
    return await ipcRenderer.invoke('db:import-sql', key, sqlFilePath)
  },
  dbImportSqlSelective: async (key: string, sqlFilePath: string, tableNames: string[]): Promise<{ success: boolean; tables: string[]; message: string }> => {
    return await ipcRenderer.invoke('db:import-sql-selective', key, sqlFilePath, tableNames)
  },
  dbPickSqlite: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('db:pick-sqlite')
  },
  dbPickMysqlExe: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('db:pick-mysql-exe')
  },
  dbDetectMysqlExe: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('db:detect-mysql-exe')
  },
  dbTestConnection: async (config: { engine: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'; config: Record<string, unknown> }): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke('db:test-connection', config)
  },
})
