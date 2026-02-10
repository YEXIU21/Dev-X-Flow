import { useMemo, useState } from 'react'

type AppTab =
  | 'Status & Commit'
  | 'History'
  | 'Remote'
  | 'Stash'
  | 'Terminal'
  | 'Debug'
  | 'Diff Viewer'
  | 'Merge Resolver'
  | 'Rebase'
  | 'Database'

export function App() {
  const tabs: AppTab[] = useMemo(
    () => [
      'Status & Commit',
      'History',
      'Remote',
      'Stash',
      'Terminal',
      'Debug',
      'Diff Viewer',
      'Merge Resolver',
      'Rebase',
      'Database',
    ],
    []
  )

  const [activeTab, setActiveTab] = useState<AppTab>('Status & Commit')
  const [repoPath, setRepoPath] = useState('D:\\projects\\devxflow\\repo')
  const [status, setStatus] = useState<
    | {
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
    | null
  >(null)
  const [changes, setChanges] = useState<{ path: string; index: string; working_dir: string }[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [commitMessage, setCommitMessage] = useState('')
  const [activeFile, setActiveFile] = useState<{ path: string; mode: 'staged' | 'unstaged' } | null>(null)
  const [activeDiff, setActiveDiff] = useState<string>('')
  const [aiBusy, setAiBusy] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [historyCount, setHistoryCount] = useState(50)
  const [logItems, setLogItems] = useState<
    { hash: string; date: string; message: string; author_name: string; author_email: string }[]
  >([])
  const [activeCommit, setActiveCommit] = useState<string | null>(null)
  const [commitDetails, setCommitDetails] = useState<string>('')
  const [remoteBusy, setRemoteBusy] = useState(false)
  const [remotes, setRemotes] = useState<{ name: string; fetch: string; push: string }[]>([])
  const [remoteName, setRemoteName] = useState('origin')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [remoteOutput, setRemoteOutput] = useState('')
  const [stashBusy, setStashBusy] = useState(false)
  const [stashes, setStashes] = useState<{ index: number; message: string }[]>([])
  const [stashMessage, setStashMessage] = useState('WIP')
  const [stashIndex, setStashIndex] = useState<number | ''>('')
  const [stashOutput, setStashOutput] = useState('')
  const [termBusy, setTermBusy] = useState(false)
  const [termCommand, setTermCommand] = useState('git status')
  const [termResult, setTermResult] = useState<{ code: number | null; stdout: string; stderr: string } | null>(null)
  const [debugBusy, setDebugBusy] = useState(false)
  const [appInfo, setAppInfo] = useState<{ platform: string; arch: string; versions: Record<string, string> } | null>(null)
  const [dvMode, setDvMode] = useState<'staged' | 'unstaged'>('unstaged')
  const [dvFile, setDvFile] = useState<string>('')
  const [dvDiff, setDvDiff] = useState<string>('')
  const [dvBusy, setDvBusy] = useState(false)
  const [dvQuery, setDvQuery] = useState('')
  const [mrBusy, setMrBusy] = useState(false)
  const [mrFiles, setMrFiles] = useState<string[]>([])
  const [mrActive, setMrActive] = useState<string>('')
  const [mrStage, setMrStage] = useState<1 | 2 | 3>(2)
  const [mrContent, setMrContent] = useState<string>('')
  const [rbBusy, setRbBusy] = useState(false)
  const [rbStatus, setRbStatus] = useState<{
    inProgress: boolean
    type: 'rebase-apply' | 'rebase-merge' | null
    headName: string | null
    onto: string | null
    step: number | null
    total: number | null
  } | null>(null)
  const [rbOutput, setRbOutput] = useState('')
  const [dbBusy, setDbBusy] = useState(false)
  const [dbPath, setDbPath] = useState('')
  const [dbConnectedPath, setDbConnectedPath] = useState<string | null>(null)
  const [dbSql, setDbSql] = useState('select 1 as ok;')
  const [dbResult, setDbResult] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  // Dialog visibility states
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [showSwitchBranchDialog, setShowSwitchBranchDialog] = useState(false)
  const [showDeleteBranchDialog, setShowDeleteBranchDialog] = useState(false)
  const [showGitAuthorDialog, setShowGitAuthorDialog] = useState(false)

  const normalizeStashIndex = () => {
    if (stashIndex === '') return undefined
    if (!Number.isFinite(stashIndex)) return undefined
    return stashIndex
  }

  const stagedChanges = useMemo(() => {
    return changes.filter((c) => c.index && c.index !== ' ' && c.index !== '?')
  }, [changes])

  const unstagedChanges = useMemo(() => {
    return changes.filter((c) => c.working_dir && c.working_dir !== ' ')
  }, [changes])

  const selectedPaths = useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k)
  }, [selected])

  const dvCounts = useMemo(() => {
    const staged = changes.filter((c) => c.index && c.index.trim() && c.index !== '?' && c.index !== ' ').length
    const unstaged = changes.filter((c) => c.working_dir && c.working_dir.trim() && c.working_dir !== ' ').length
    return { staged, unstaged, total: changes.length }
  }, [changes])

  const dvFiltered = useMemo(() => {
    const q = dvQuery.trim().toLowerCase()
    if (!q) return changes
    return changes.filter((c) => c.path.toLowerCase().includes(q))
  }, [changes, dvQuery])

  const refreshStatus = async (path: string) => {
    setError(null)
    try {
      const s = await window.devxflow.getRepoStatus(path)
      setStatus(s)
      const c = await window.devxflow.getRepoChanges(path)
      setChanges(c)
    } catch (e) {
      setStatus(null)
      setChanges([])
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handlePickRepo = async () => {
    setError(null)
    const picked = await window.devxflow.pickRepo()
    if (!picked) return
    setRepoPath(picked)
    await refreshStatus(picked)
  }

  const toggleSelected = (path: string) => {
    setSelected((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  const openDiff = async (path: string, mode: 'staged' | 'unstaged') => {
    if (!repoPath) return
    setError(null)
    setActiveFile({ path, mode })
    try {
      const d = await window.devxflow.getDiff(repoPath, path, mode)
      setActiveDiff(d || 'No diff available.')
    } catch (e) {
      setActiveDiff('')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const clearSelected = () => setSelected({})

  const handleStage = async () => {
    if (!repoPath) return
    setError(null)
    try {
      await window.devxflow.stageFiles(repoPath, selectedPaths)
      clearSelected()
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleUnstage = async () => {
    if (!repoPath) return
    setError(null)
    try {
      await window.devxflow.unstageFiles(repoPath, selectedPaths)
      clearSelected()
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleCommit = async () => {
    if (!repoPath) return
    setError(null)
    try {
      await window.devxflow.commit(repoPath, commitMessage)
      setCommitMessage('')
      clearSelected()
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleAiGenerate = async () => {
    if (!repoPath) return
    setError(null)
    setAiBusy(true)
    try {
      const msg = await window.devxflow.generateCommitMessage(repoPath)
      setCommitMessage(msg)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiBusy(false)
    }
  }

  const refreshHistory = async () => {
    if (!repoPath) return
    setError(null)
    setHistoryBusy(true)
    try {
      const items = await window.devxflow.getLog(repoPath, historyCount)
      setLogItems(items)
      if (items.length > 0 && !activeCommit) {
        setActiveCommit(items[0].hash)
        const details = await window.devxflow.getCommitDetails(repoPath, items[0].hash)
        setCommitDetails(details)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setHistoryBusy(false)
    }
  }

  const openCommit = async (hash: string) => {
    if (!repoPath) return
    setError(null)
    setActiveCommit(hash)
    try {
      const details = await window.devxflow.getCommitDetails(repoPath, hash)
      setCommitDetails(details)
    } catch (e) {
      setCommitDetails('')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const refreshRemotes = async () => {
    if (!repoPath) return
    setError(null)
    setRemoteBusy(true)
    try {
      const r = await window.devxflow.getRemotes(repoPath)
      setRemotes(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRemoteBusy(false)
    }
  }

const runRemoteAction = async (action: () => Promise<string>) => {
  if (!repoPath) return
  setError(null)
  setRemoteBusy(true)
  try {
    const out = await action()
    setRemoteOutput(out)
    await refreshStatus(repoPath)
    await refreshHistory()
    await refreshRemotes()
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  } finally {
    setRemoteBusy(false)
  }
}

const handleAddRemote = async () => {
  if (!repoPath) return
  setError(null)
  setRemoteBusy(true)
  try {
    await window.devxflow.addRemote(repoPath, remoteName, remoteUrl)
    setRemoteUrl('')
    await refreshRemotes()
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  } finally {
    setRemoteBusy(false)
  }
}

const refreshStashes = async () => {
  if (!repoPath) return
  setError(null)
  setStashBusy(true)
  try {
    const s = await window.devxflow.getStashes(repoPath)
    setStashes(s)
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  } finally {
    setStashBusy(false)
  }
}

const runStashAction = async (action: () => Promise<string>) => {
  if (!repoPath) return
  setError(null)
  setStashBusy(true)
  try {
    const out = await action()
    setStashOutput(out)
    await refreshStatus(repoPath)
    await refreshStashes()
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  } finally {
    setStashBusy(false)
  }
}

  const runTerminal = async () => {
    if (!repoPath) return
    setError(null)
    setTermBusy(true)
    try {
      const res = await window.devxflow.runTerminal(repoPath, termCommand)
      setTermResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTermBusy(false)
    }
  }

  const refreshDebugInfo = async () => {
    setError(null)
    setDebugBusy(true)
    try {
      const info = await window.devxflow.getAppInfo()
      setAppInfo(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDebugBusy(false)
    }
  }

  const openDiffViewerFile = async (path: string, mode: 'staged' | 'unstaged') => {
    if (!repoPath) return
    setError(null)
    setDvBusy(true)
    setDvMode(mode)
    setDvFile(path)
    try {
      const diff = await window.devxflow.getDiff(repoPath, path, mode)
      setDvDiff(diff)
    } catch (e) {
      setDvDiff('')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDvBusy(false)
    }
  }

  const refreshMergeResolver = async () => {
    if (!repoPath) return
    setError(null)
    setMrBusy(true)
    try {
      const files = await window.devxflow.getConflicts(repoPath)
      setMrFiles(files)
      if (files.length > 0 && !mrActive) {
        setMrActive(files[0])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMrBusy(false)
    }
  }

  const openMergeFile = async (filePath: string, stage: 1 | 2 | 3) => {
    if (!repoPath) return
    setError(null)
    setMrBusy(true)
    setMrActive(filePath)
    setMrStage(stage)
    try {
      const content = await window.devxflow.getConflictVersion(repoPath, filePath, stage)
      setMrContent(content)
    } catch (e) {
      setMrContent('')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMrBusy(false)
    }
  }

  const refreshRebase = async () => {
    if (!repoPath) return
    setError(null)
    setRbBusy(true)
    try {
      const s = await window.devxflow.getRebaseStatus(repoPath)
      setRbStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRbBusy(false)
    }
  }

  const runRebaseAction = async (action: 'continue' | 'skip' | 'abort') => {
    if (!repoPath) return
    setError(null)
    setRbBusy(true)
    try {
      const out =
        action === 'continue'
          ? await window.devxflow.rebaseContinue(repoPath)
          : action === 'skip'
            ? await window.devxflow.rebaseSkip(repoPath)
            : await window.devxflow.rebaseAbort(repoPath)
      setRbOutput(out)
      await refreshRebase()
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRbBusy(false)
    }
  }

  const ensureDbDefaultPath = async () => {
    if (dbPath.trim()) return
    try {
      const p = await window.devxflow.getDefaultDbPath()
      setDbPath(p)
    } catch {
      // ignore
    }
  }

  const browseDb = async () => {
    setError(null)
    setDbBusy(true)
    try {
      const picked = await window.devxflow.pickDb()
      if (picked) setDbPath(picked)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const connectDb = async () => {
    setError(null)
    setDbBusy(true)
    try {
      await ensureDbDefaultPath()
      const res = await window.devxflow.connectDb(dbPath)
      setDbConnectedPath(res.path)
      setDbResult(`Connected: ${res.path}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const closeDb = async () => {
    setError(null)
    setDbBusy(true)
    try {
      await window.devxflow.closeDb(dbConnectedPath || dbPath)
      setDbConnectedPath(null)
      setDbResult('Closed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const runDbQuery = async () => {
    setError(null)
    setDbBusy(true)
    try {
      const p = dbConnectedPath || dbPath
      const res = await window.devxflow.queryDb(p, dbSql)
      setDbResult(JSON.stringify(res, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const handleStageAll = async () => {
    if (!repoPath) return
    setError(null)
    try {
      await window.devxflow.stageAll(repoPath)
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handlePush = async () => {
    if (!repoPath || !status) return
    setError(null)
    try {
      await window.devxflow.push(repoPath, status.branch)
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleSyncToMain = async () => {
    if (!repoPath || !status) return
    setError(null)
    try {
      // Stage all changes
      await window.devxflow.stageAll(repoPath)
      // Commit with current message
      if (commitMessage.trim()) {
        await window.devxflow.commit(repoPath, commitMessage)
      }
      // Push current branch
      await window.devxflow.push(repoPath, status.branch)
      // Switch to main
      await window.devxflow.switchBranch(repoPath, 'main')
      // Merge feature branch
      await window.devxflow.merge(repoPath, status.branch)
      // Push main
      await window.devxflow.push(repoPath, 'main')
      // Pull latest
      await window.devxflow.pull(repoPath, 'merge')
      // Switch back to original branch
      await window.devxflow.switchBranch(repoPath, status.branch)
      setCommitMessage('')
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const runDbExec = async () => {
    setError(null)
    setDbBusy(true)
    try {
      const p = dbConnectedPath || dbPath
      const res = await window.devxflow.execDb(p, dbSql)
      setDbResult(JSON.stringify(res, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const panelTitle = useMemo(() => {
    switch (activeTab) {
      case 'Status & Commit':
        return 'Working Tree'
      case 'History':
        return 'Commit History'
      case 'Remote':
        return 'Remote Sync'
      case 'Stash':
        return 'Stash Operations'
      case 'Terminal':
        return 'Terminal'
      case 'Debug':
        return 'Debug Logs'
      case 'Diff Viewer':
        return 'Diff Output'
      case 'Merge Resolver':
        return 'Merge Conflict Resolver'
      case 'Rebase':
        return 'Interactive Rebase'
      case 'Database':
        return 'Database Tools'
      default:
        return 'Dev-X-Flow-Pro'
    }
  }, [activeTab])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">Dev-X-Flow-Pro</div>
        <div className="app-version">v0.1.0</div>
      </header>

      <div className="main-container">
        {/* Repository Path Section - matches Python GUI */}
        <div className="repo-section">
          <div className="section-label">REPOSITORY PATH</div>
          <div className="repo-path-row">
            <div className="repo-path-value" title={repoPath}>
              {repoPath}
            </div>
            <div className="repo-actions">
              <button type="button" className="btn btn-secondary" onClick={handlePickRepo}>
                Browse
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => refreshStatus(repoPath)}
                disabled={!repoPath}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className={`repo-status ${status ? 'repo-valid' : 'repo-invalid'}`}>
            {status ? '● Git Repository' : '● Not a Git Repository'}
          </div>
        </div>

        {/* Branch Info Card - matches Python GUI */}
        <div className="branch-card">
          <div className="section-label">CURRENT BRANCH</div>
          <div className="branch-value">{status?.branch ?? '—'}</div>
        </div>

        {/* Tab Navigation - Top tabs like Python TNotebook */}
        <div className="tab-bar">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={t === activeTab ? 'tab tab-active' : 'tab'}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'Status & Commit' ? (
            <div className="status-enterprise">
              {/* Branch Controls Toolbar */}
              <div className="toolbar">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBranchDialog(true)}>
                  + Branch
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSwitchBranchDialog(true)}>
                  Switch
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setShowDeleteBranchDialog(true)}>
                  Delete
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGitAuthorDialog(true)}>
                  Author
                </button>
                <button type="button" className="btn btn-secondary btn-refresh" onClick={() => refreshStatus(repoPath)} disabled={!repoPath}>
                  Refresh
                </button>
              </div>

              {/* Git Status Panel */}
              <div className="panel">
                <div className="panel-title">Git Status</div>
                <pre className="status-output">
                  {status ? `On branch ${status.branch}
Your branch is ${status.ahead > 0 ? `ahead of origin/${status.branch} by ${status.ahead} commit(s)` : status.behind > 0 ? `behind origin/${status.branch} by ${status.behind} commit(s)` : 'up to date with origin/' + status.branch}

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
${stagedChanges.map(c => `\tmodified:   ${c.path}`).join('\n') || '\t(no changes staged)'}

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
${unstagedChanges.map(c => `\tmodified:   ${c.path}`).join('\n') || '\t(no changes)'}

Untracked files:
  (use "git add <file>..." to include in what will be committed)
${changes.filter(c => c.index === '?').map(c => `\t${c.path}`).join('\n') || '\t(no untracked files)'}` : 'Not a git repository. Please select or initialize a repository.'}
                </pre>
              </div>

              {/* Commit & Push Panel */}
              <div className="panel">
                <div className="panel-title">Commit & Push</div>
                <div className="commit-section">
                  {/* Compact Commit Row */}
                  <div className="commit-compact-row">
                    <input
                      className="commit-input-compact"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Enter commit message..."
                    />
                    <button type="button" className="btn btn-success btn-ai" onClick={handleAiGenerate} disabled={aiBusy || !repoPath}>
                      ✨ AI
                    </button>
                  </div>
                  
                  {/* Action Buttons - Compact Row */}
                  <div className="action-row">
                    <button type="button" className="btn btn-primary" onClick={handleStageAll} disabled={!repoPath || (unstagedChanges.length === 0 && changes.filter(c => c.index === '?').length === 0)}>
                      Stage All
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleCommit} disabled={!commitMessage.trim() || !repoPath || stagedChanges.length === 0}>
                      Commit
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handlePush} disabled={!repoPath || !status}>
                      Push
                    </button>
                    <button type="button" className="btn btn-success" onClick={handleSyncToMain} disabled={!repoPath || !status || status.branch === 'main' || status.branch === 'master'}>
                      Sync Main
                    </button>
                  </div>
                </div>
              </div>

              {error ? <div className="panel-error">{error}</div> : null}
            </div>
          ) : activeTab === 'History' ? (
              <div className="history-grid">
                <div className="history-toolbar">
                  <div className="commit-label">Commits</div>
                  <input
                    className="commit-input"
                    value={String(historyCount)}
                    onChange={(e) => setHistoryCount(Number(e.target.value || '50'))}
                    placeholder="50"
                    inputMode="numeric"
                  />
                  <button type="button" className="btn btn-primary" onClick={refreshHistory} disabled={historyBusy || !repoPath}>
                    {historyBusy ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                <div className="history-split">
                  <div className="history-list" aria-label="Commit list">
                    {logItems.length === 0 ? (
                      <div className="changes-empty">No commits loaded. Click Refresh.</div>
                    ) : (
                      logItems.map((c) => (
                        <button
                          key={c.hash}
                          type="button"
                          className={c.hash === activeCommit ? 'history-item history-item-active' : 'history-item'}
                          onClick={() => openCommit(c.hash)}
                        >
                          <div className="history-msg">{c.message}</div>
                          <div className="history-meta">
                            <span className="history-hash">{c.hash.slice(0, 7)}</span>
                            <span className="history-date">{c.date}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="diff-panel" aria-label="Commit details">
                    <div className="diff-title">{activeCommit ? `Commit: ${activeCommit.slice(0, 7)}` : 'Commit'}</div>
                    <pre className="diff-body">{commitDetails || 'Select a commit to view details.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">History baseline: log list + commit details. Next: search/filter and richer metadata to match Python app.</div>
              </div>
            ) : activeTab === 'Remote' ? (
              <div className="remote-grid">
                <div className="remote-toolbar">
                  <div className="commit-label">Remote</div>
                  <button type="button" className="btn" onClick={refreshRemotes} disabled={remoteBusy || !repoPath}>
                    {remoteBusy ? 'Loading…' : 'Refresh Remotes'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => runRemoteAction(() => window.devxflow.pull(repoPath, 'merge'))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Pull (Merge)
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => runRemoteAction(() => window.devxflow.pull(repoPath, 'rebase'))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Pull (Rebase)
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => runRemoteAction(() => window.devxflow.fetch(repoPath))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Fetch
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => runRemoteAction(() => window.devxflow.push(repoPath))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Push
                  </button>
                </div>

                <div className="remote-split">
                  <div className="remote-panel">
                    <div className="diff-title">Remotes</div>
                    <div className="remote-list">
                      {remotes.length === 0 ? (
                        <div className="changes-empty">No remotes loaded. Click Refresh Remotes.</div>
                      ) : (
                        remotes.map((r) => (
                          <div key={r.name} className="remote-item">
                            <div className="remote-name">{r.name}</div>
                            <div className="remote-url" title={r.fetch}>
                              fetch: {r.fetch}
                            </div>
                            <div className="remote-url" title={r.push}>
                              push: {r.push}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="remote-add">
                      <input
                        className="commit-input"
                        value={remoteName}
                        onChange={(e) => setRemoteName(e.target.value)}
                        placeholder="origin"
                      />
                      <input
                        className="commit-input"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                        placeholder="https://github.com/user/repo.git"
                      />
                      <button type="button" className="btn btn-primary" onClick={handleAddRemote} disabled={remoteBusy || !remoteUrl.trim()}>
                        + Add Remote
                      </button>
                    </div>
                  </div>

                  <div className="diff-panel" aria-label="Remote output">
                    <div className="diff-title">Output</div>
                    <pre className="diff-body">{remoteOutput || 'Run Fetch/Pull/Push to see output.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Remote baseline: list remotes, add remote, fetch/pull/push.</div>
              </div>
            ) : activeTab === 'Stash' ? (
              <div className="stash-grid">
                <div className="stash-toolbar">
                  <div className="commit-label">Stash</div>
                  <button type="button" className="btn" onClick={refreshStashes} disabled={stashBusy || !repoPath}>
                    {stashBusy ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                <div className="stash-split">
                  <div className="stash-panel">
                    <div className="diff-title">Stashes</div>
                    <div className="stash-list">
                      {stashes.length === 0 ? (
                        <div className="changes-empty">No stashes loaded. Click Refresh.</div>
                      ) : (
                        stashes.map((s) => (
                          <div key={String(s.index)} className="stash-item">
                            <div className="stash-name">{`stash@{${s.index}}`}</div>
                            <div className="stash-msg">{s.message}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="stash-actions">
                      <input
                        className="commit-input"
                        value={stashMessage}
                        onChange={(e) => setStashMessage(e.target.value)}
                        placeholder="WIP message"
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => runStashAction(() => window.devxflow.stashSave(repoPath, stashMessage))}
                        disabled={stashBusy || !repoPath}
                      >
                        Save
                      </button>
                    </div>

                    <div className="stash-actions">
                      <input
                        className="commit-input"
                        value={stashIndex === '' ? '' : String(stashIndex)}
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          setStashIndex(v === '' ? '' : Number(v))
                        }}
                        placeholder="index (optional)"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="btn"
                        onClick={() => runStashAction(() => window.devxflow.stashApply(repoPath, normalizeStashIndex()))}
                        disabled={stashBusy || !repoPath}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => runStashAction(() => window.devxflow.stashPop(repoPath, normalizeStashIndex()))}
                        disabled={stashBusy || !repoPath}
                      >
                        Pop
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => runStashAction(() => window.devxflow.stashDrop(repoPath, normalizeStashIndex()))}
                        disabled={stashBusy || !repoPath}
                      >
                        Drop
                      </button>
                    </div>
                  </div>

                  <div className="diff-panel" aria-label="Stash output">
                    <div className="diff-title">Output</div>
                    <pre className="diff-body">{stashOutput || 'Run Save/Apply/Pop/Drop to see output.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Stash baseline: list + save + apply/pop/drop.</div>
              </div>
            ) : activeTab === 'Terminal' ? (
              <div className="terminal-grid">
                <div className="terminal-toolbar">
                  <div className="commit-label">Terminal</div>
                  <input
                    className="commit-input"
                    value={termCommand}
                    onChange={(e) => setTermCommand(e.target.value)}
                    placeholder="command"
                  />
                  <button type="button" className="btn btn-primary" onClick={runTerminal} disabled={termBusy || !repoPath}>
                    {termBusy ? 'Running…' : 'Run'}
                  </button>
                </div>

                <div className="diff-panel" aria-label="Terminal output">
                  <div className="diff-title">Output {termResult ? `(code: ${String(termResult.code)})` : ''}</div>
                  <pre className="diff-body">
                    {termResult
                      ? `${termResult.stdout}${termResult.stderr ? `\n--- stderr ---\n${termResult.stderr}` : ''}`
                      : 'Run a command to see output.'}
                  </pre>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Terminal baseline: run one command in repo cwd and capture stdout/stderr.</div>
              </div>
            ) : activeTab === 'Debug' ? (
              <div className="debug-grid">
                <div className="debug-toolbar">
                  <div className="commit-label">Debug</div>
                  <button type="button" className="btn btn-primary" onClick={refreshDebugInfo} disabled={debugBusy}>
                    {debugBusy ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                <div className="diff-panel" aria-label="Debug info">
                  <div className="diff-title">App / Repo Diagnostics</div>
                  <pre className="diff-body">
                    {JSON.stringify(
                      {
                        repoPath,
                        activeTab,
                        status,
                        appInfo,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Debug baseline: app versions + current repo state snapshot.</div>
              </div>
            ) : activeTab === 'Diff Viewer' ? (
              <div className="dv-grid">
                <div className="dv-toolbar">
                  <div className="commit-label">Diff Viewer</div>
                  <input
                    className="commit-input"
                    value={dvQuery}
                    onChange={(e) => setDvQuery(e.target.value)}
                    placeholder={`Filter files (${dvCounts.total})`}
                  />
                  <button
                    type="button"
                    className={dvMode === 'unstaged' ? 'btn btn-primary' : 'btn'}
                    onClick={() => {
                      setDvMode('unstaged')
                      if (dvFile) void openDiffViewerFile(dvFile, 'unstaged')
                    }}
                    disabled={dvBusy}
                  >
                    Unstaged ({dvCounts.unstaged})
                  </button>
                  <button
                    type="button"
                    className={dvMode === 'staged' ? 'btn btn-primary' : 'btn'}
                    onClick={() => {
                      setDvMode('staged')
                      if (dvFile) void openDiffViewerFile(dvFile, 'staged')
                    }}
                    disabled={dvBusy}
                  >
                    Staged ({dvCounts.staged})
                  </button>
                  <button type="button" className="btn" onClick={() => repoPath && void refreshStatus(repoPath)} disabled={!repoPath}>
                    Refresh Status
                  </button>
                </div>

                <div className="dv-split">
                  <div className="dv-list" aria-label="Files">
                    {dvFiltered.length === 0 ? (
                      <div className="changes-empty">No changes loaded. Click Refresh Status.</div>
                    ) : (
                      dvFiltered.map((c) => (
                        <button
                          key={c.path}
                          type="button"
                          className={c.path === dvFile ? 'history-item history-item-active' : 'history-item'}
                          onClick={() => void openDiffViewerFile(c.path, dvMode)}
                        >
                          <div className="history-msg">
                            <span className={c.index.trim() && c.index !== '?' ? 'dv-badge dv-badge-staged' : 'dv-badge dv-badge-none'}>
                              {c.index.trim() && c.index !== '?' ? 'STAGED' : '—'}
                            </span>
                            <span className={c.working_dir.trim() && c.working_dir !== ' ' ? 'dv-badge dv-badge-unstaged' : 'dv-badge dv-badge-none'}>
                              {c.working_dir.trim() && c.working_dir !== ' ' ? 'UNSTAGED' : '—'}
                            </span>
                            <span className="dv-path">{c.path}</span>
                          </div>
                          <div className="history-meta">
                            <span className="history-hash">{c.index.trim() || ' '}</span>
                            <span className="history-date">{c.working_dir.trim() || ' '}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="diff-panel" aria-label="Diff">
                    <div className="diff-title">
                      {dvFile ? `${dvMode === 'staged' ? 'Staged' : 'Unstaged'}: ${dvFile}` : 'Diff'}
                    </div>
                    <pre className="diff-body">{dvBusy ? 'Loading…' : dvDiff || 'Select a file to view diff.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Diff Viewer baseline: select file and view staged/unstaged diff.</div>
              </div>
            ) : activeTab === 'Merge Resolver' ? (
              <div className="mr-grid">
                <div className="mr-toolbar">
                  <div className="commit-label">Merge</div>
                  <button type="button" className="btn btn-primary" onClick={refreshMergeResolver} disabled={mrBusy || !repoPath}>
                    {mrBusy ? 'Loading…' : 'Refresh Conflicts'}
                  </button>
                  <button type="button" className={mrStage === 1 ? 'btn btn-primary' : 'btn'} onClick={() => mrActive && void openMergeFile(mrActive, 1)} disabled={mrBusy || !mrActive}>
                    Base
                  </button>
                  <button type="button" className={mrStage === 2 ? 'btn btn-primary' : 'btn'} onClick={() => mrActive && void openMergeFile(mrActive, 2)} disabled={mrBusy || !mrActive}>
                    Ours
                  </button>
                  <button type="button" className={mrStage === 3 ? 'btn btn-primary' : 'btn'} onClick={() => mrActive && void openMergeFile(mrActive, 3)} disabled={mrBusy || !mrActive}>
                    Theirs
                  </button>
                </div>

                <div className="mr-split">
                  <div className="dv-list" aria-label="Conflicted files">
                    {mrFiles.length === 0 ? (
                      <div className="changes-empty">No conflicts detected.</div>
                    ) : (
                      mrFiles.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={f === mrActive ? 'history-item history-item-active' : 'history-item'}
                          onClick={() => void openMergeFile(f, mrStage)}
                        >
                          <div className="history-msg">{f}</div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="diff-panel" aria-label="Conflict content">
                    <div className="diff-title">{mrActive ? `${mrActive} (${mrStage === 1 ? 'BASE' : mrStage === 2 ? 'OURS' : 'THEIRS'})` : 'Conflict'}</div>
                    <pre className="diff-body">{mrBusy ? 'Loading…' : mrContent || 'Select a conflicted file.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Merge Resolver baseline: list conflicted files and inspect base/ours/theirs.</div>
              </div>
            ) : activeTab === 'Rebase' ? (
              <div className="rb-grid">
                <div className="mr-toolbar">
                  <div className="commit-label">Rebase</div>
                  <button type="button" className="btn btn-primary" onClick={refreshRebase} disabled={rbBusy || !repoPath}>
                    {rbBusy ? 'Loading…' : 'Refresh'}
                  </button>
                  <button type="button" className="btn" onClick={() => void runRebaseAction('continue')} disabled={rbBusy || !rbStatus?.inProgress}>
                    Continue
                  </button>
                  <button type="button" className="btn" onClick={() => void runRebaseAction('skip')} disabled={rbBusy || !rbStatus?.inProgress}>
                    Skip
                  </button>
                  <button type="button" className="btn" onClick={() => void runRebaseAction('abort')} disabled={rbBusy || !rbStatus?.inProgress}>
                    Abort
                  </button>
                </div>

                <div className="mr-split">
                  <div className="diff-panel" aria-label="Rebase status">
                    <div className="diff-title">Status</div>
                    <pre className="diff-body">
                      {rbStatus
                        ? JSON.stringify(rbStatus, null, 2)
                        : 'Click Refresh to load rebase status.'}
                    </pre>
                  </div>

                  <div className="diff-panel" aria-label="Rebase output">
                    <div className="diff-title">Output</div>
                    <pre className="diff-body">{rbOutput || 'Run Continue/Skip/Abort to see output.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Rebase baseline: detect in-progress rebase and run continue/skip/abort.</div>
              </div>
            ) : activeTab === 'Database' ? (
              <div className="db-grid">
                <div className="terminal-toolbar">
                  <div className="commit-label">DB</div>
                  <input className="commit-input" value={dbPath} onChange={(e) => setDbPath(e.target.value)} placeholder="db path" />
                  <button type="button" className="btn" onClick={browseDb} disabled={dbBusy}>
                    Browse
                  </button>
                  <button type="button" className="btn btn-primary" onClick={connectDb} disabled={dbBusy}>
                    Connect
                  </button>
                  <button type="button" className="btn" onClick={closeDb} disabled={dbBusy}>
                    Close
                  </button>
                </div>

                <div className="db-split">
                  <div className="diff-panel" aria-label="SQL">
                    <div className="diff-title">SQL</div>
                    <textarea className="commit-input" value={dbSql} onChange={(e) => setDbSql(e.target.value)} rows={10} placeholder="SQL query or command" />
                    <div className="db-actions">
                      <button type="button" className="btn btn-primary" onClick={runDbQuery} disabled={dbBusy}>
                        Query
                      </button>
                      <button type="button" className="btn" onClick={runDbExec} disabled={dbBusy}>
                        Exec
                      </button>
                      <div className="panel-hint">Connected: {dbConnectedPath || '—'}</div>
                    </div>
                  </div>

                  <div className="diff-panel" aria-label="DB result">
                    <div className="diff-title">Result</div>
                    <pre className="diff-body">{dbBusy ? 'Working…' : dbResult || 'Run Query/Exec to see output.'}</pre>
                  </div>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Database baseline: connect to local SQLite and run SQL.</div>
              </div>
            ) : (
              <div className="panel-hint">
                UI shell created. Next: implement real {activeTab} features from `Dev-X-Flow-Pro/Dev-X-Flow-Pro.py`.
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
