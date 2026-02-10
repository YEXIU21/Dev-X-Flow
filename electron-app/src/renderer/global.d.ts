export {}

declare global {
  interface Window {
    devxflow: {
      version: string
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
      switchBranch: (repoPath: string, branch: string) => Promise<boolean>
      merge: (repoPath: string, branch: string) => Promise<boolean>
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
    }
  }
}
