export {}

declare global {
  interface ImportMetaEnv {
    readonly DEV: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    devxflow: {
      version: string
      openExternal: (url: string) => Promise<boolean>
      pickRepo: () => Promise<string | null>
      getRepoStatus: (repoPath: string) => Promise<{
        branch: string
        staged: number
        modified: number
        created: number
        deleted: number
        renamed: number
        conflicted: number
        ahead: number
        behind: number
      }>
      getRepoChanges: (repoPath: string) => Promise<
        {
          path: string
          index: string
          working_dir: string
        }[]
      >
      stageFiles: (repoPath: string, paths: string[]) => Promise<boolean>
      unstageFiles: (repoPath: string, paths: string[]) => Promise<boolean>
      commit: (repoPath: string, message: string) => Promise<boolean>
      getDiff: (repoPath: string, filePath: string, mode: 'staged' | 'unstaged') => Promise<string>
      generateCommitMessage: (repoPath: string) => Promise<string>
      getLog: (repoPath: string, maxCount: number) => Promise<
        {
          hash: string
          date: string
          message: string
          author_name: string
          author_email: string
        }[]
      >
      getLogGraph: (repoPath: string, maxCount: number) => Promise<string>
      getCommitDetails: (repoPath: string, hash: string) => Promise<string>
      getRemotes: (repoPath: string) => Promise<
        {
          name: string
          fetch: string
          push: string
        }[]
      >
      addRemote: (repoPath: string, name: string, url: string) => Promise<boolean>
      fetch: (repoPath: string) => Promise<string>
      pull: (repoPath: string, mode: 'merge' | 'rebase') => Promise<string>
      push: (repoPath: string, branch?: string) => Promise<string>
      stageAll: (repoPath: string) => Promise<boolean>
      initRepo: (repoPath: string) => Promise<boolean>
      createBranch: (repoPath: string, branch: string) => Promise<boolean>
      switchBranch: (repoPath: string, branch: string) => Promise<boolean>
      deleteBranch: (repoPath: string, branch: string) => Promise<boolean>
      merge: (repoPath: string, branch: string) => Promise<boolean>
      getGitAuthor: () => Promise<{ name: string; email: string }>
      setGitAuthor: (name: string, email: string) => Promise<boolean>
      getStashes: (repoPath: string) => Promise<
        {
          index: number
          message: string
        }[]
      >
      stashSave: (repoPath: string, message: string) => Promise<string>
      stashPop: (repoPath: string, index?: number) => Promise<string>
      stashApply: (repoPath: string, index?: number) => Promise<string>
      stashDrop: (repoPath: string, index?: number) => Promise<string>
      runTerminal: (
        repoPath: string,
        command: string
      ) => Promise<{
        code: number | null
        stdout: string
        stderr: string
      }>
      getTerminalHistory: () => Promise<string[]>
      addTerminalHistory: (command: string) => Promise<boolean>
      detectProjectType: (repoPath: string) => Promise<'Laravel' | 'Node.js' | 'Python' | 'General'>
      getTerminalSuggestions: (projectType: 'Laravel' | 'Node.js' | 'Python' | 'General') => Promise<string[]>
      getAppInfo: () => Promise<{
        platform: string
        arch: string
        versions: Record<string, string>
      }>
      getConflicts: (repoPath: string) => Promise<string[]>
      getConflictVersion: (repoPath: string, filePath: string, stage: 1 | 2 | 3) => Promise<string>
      getRebaseStatus: (repoPath: string) => Promise<{
        inProgress: boolean
        type: 'rebase-apply' | 'rebase-merge' | null
        headName: string | null
        onto: string | null
        step: number | null
        total: number | null
      }>
      rebaseContinue: (repoPath: string) => Promise<string>
      rebaseSkip: (repoPath: string) => Promise<string>
      rebaseAbort: (repoPath: string) => Promise<string>
      getDefaultDbPath: () => Promise<string>
      pickDb: () => Promise<string | null>
      connectDb: (dbPath: string) => Promise<{ ok: boolean; path: string }>
      queryDb: (dbPath: string, sql: string) => Promise<{ rows: unknown[] }>
      execDb: (dbPath: string, sql: string) => Promise<{ ok: boolean }>
      closeDb: (dbPath: string) => Promise<boolean>
      // Debug / Laravel Log Monitor APIs
      debugDetectLog: (repoPath: string) => Promise<string | null>
      debugReadLog: (repoPath: string) => Promise<{
        lines: { text: string; level: 'error' | 'warning' | 'info' | 'debug' | 'timestamp' | 'other' }[]
        summary: { errors: number; warnings: number; info: number; debug: number; total: number }
        filePath: string | null
        truncated: boolean
      }>
      debugWatchStart: (repoPath: string) => Promise<{ success: boolean; filePath: string | null }>
      debugWatchStop: (repoPath: string) => Promise<boolean>
      debugOpenLog: (filePath: string) => Promise<boolean>
      onDebugUpdate: (callback: (result: {
        lines: { text: string; level: 'error' | 'warning' | 'info' | 'debug' | 'timestamp' | 'other' }[]
        summary: { errors: number; warnings: number; info: number; debug: number; total: number }
        filePath: string | null
        truncated: boolean
      }) => void) => (() => void)
      // Merge conflict resolution APIs
      parseConflict: (repoPath: string, filePath: string) => Promise<{ base: string; ours: string; theirs: string }>
      resolveConflict: (repoPath: string, filePath: string, side: 'ours' | 'theirs') => Promise<boolean>
      markResolved: (repoPath: string, filePath: string) => Promise<boolean>
      openFileExternal: (filePath: string) => Promise<boolean>
      // Interactive rebase APIs
      loadRebaseCommits: (repoPath: string, baseCommit?: string) => Promise<{ action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'; hash: string; message: string }[]>
      startInteractiveRebase: (repoPath: string, todoItems: { action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'; hash: string; message: string }[]) => Promise<string>
      writeRebaseTodo: (repoPath: string, todoItems: { action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'; hash: string; message: string }[]) => Promise<boolean>
      // Database multi-engine APIs
      dbConnect: (config: { engine: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'; config: Record<string, unknown> }) => Promise<{ ok: boolean; key: string; error?: string }>
      dbDisconnect: (key: string) => Promise<boolean>
      dbQuery: (key: string, sql: string) => Promise<{ rows: unknown[]; fields?: Array<{ name: string; type: string }> }>
      dbExecute: (key: string, sql: string) => Promise<boolean>
      dbListTables: (key: string) => Promise<string[]>
      dbListDatabases: (key: string) => Promise<string[]>
      dbTableInfo: (key: string, tableName: string) => Promise<unknown[]>
      dbPickExportDir: () => Promise<string | null>
      dbExportToTxt: (key: string, exportDir: string) => Promise<{ exported: number; files: string[] }>
      dbPickSqlFile: () => Promise<string | null>
      dbScanSqlTables: (sqlFilePath: string) => Promise<string[]>
      dbImportSql: (key: string, sqlFilePath: string) => Promise<{ success: boolean; tables: string[]; message: string }>
      dbImportSqlSelective: (key: string, sqlFilePath: string, tableNames: string[]) => Promise<{ success: boolean; tables: string[]; message: string }>
      dbPickSqlite: () => Promise<string | null>
      dbPickMysqlExe: () => Promise<string | null>
      dbDetectMysqlExe: () => Promise<string | null>
      dbTestConnection: (config: { engine: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'; config: Record<string, unknown> }) => Promise<{ ok: boolean; error?: string }>
    }
  }
}
