import { useMemo, useState, type KeyboardEvent } from 'react'
import { DebugMonitor } from './components/DebugMonitor'
import { MergeResolver } from './components/MergeResolver'
import { RebaseUI } from './components/RebaseUI'
import { DiffViewer } from './components/DiffViewer'

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
  const [termProjectType, setTermProjectType] = useState<'Laravel' | 'Node.js' | 'Python' | 'General'>('General')
  const [termSuggestionsEnabled, setTermSuggestionsEnabled] = useState(true)
  const [termSuggestions, setTermSuggestions] = useState<string[]>([])
  const [termHistory, setTermHistory] = useState<string[]>([])
  const [termHistoryIndex, setTermHistoryIndex] = useState(-1)
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
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncStep, setSyncStep] = useState(0)
  const [syncSteps] = useState([
    'Stage all changes',
    'Commit with message',
    'Push current branch',
    'Switch to main',
    'Merge feature branch',
    'Push main',
    'Pull latest',
    'Switch back to original branch'
  ])

  const [authorBusy, setAuthorBusy] = useState(false)
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')

  const openGitAuthorDialog = async () => {
    setError(null)
    setShowGitAuthorDialog(true)
    setAuthorBusy(true)
    try {
      const a = await window.devxflow.getGitAuthor()
      setAuthorName(a.name || '')
      setAuthorEmail(a.email || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAuthorBusy(false)
    }
  }

  const renderTextWithLinks = (text: string) => {
    const urlRe = /(https?:\/\/[^\s]+)/g
    const parts: (string | { url: string })[] = []

    let lastIndex = 0
    for (const m of text.matchAll(urlRe)) {
      const url = m[0]
      const index = m.index ?? 0
      if (index > lastIndex) parts.push(text.slice(lastIndex, index))
      parts.push({ url })
      lastIndex = index + url.length
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))

    return parts.map((p, i) => {
      if (typeof p === 'string') return <span key={i}>{p}</span>
      return (
        <a
          key={i}
          href={p.url}
          onClick={(e) => {
            e.preventDefault()
            void window.devxflow.openExternal(p.url)
          }}
          className="term-link"
        >
          {p.url}
        </a>
      )
    })
  }

  const renderTerminalOutput = () => {
    if (!termResult) return 'Run a command to see output.'

    const blocks: { label: string; text: string }[] = []
    if (termResult.stdout) blocks.push({ label: 'stdout', text: termResult.stdout })
    if (termResult.stderr) blocks.push({ label: 'stderr', text: termResult.stderr })

    if (blocks.length === 0) return '(no output)'

    return (
      <>
        {blocks.map((b) => (
          <div key={b.label}>
            <div className="term-section-label">{`--- ${b.label} ---`}</div>
            <div className="term-section-body">{renderTextWithLinks(b.text)}</div>
          </div>
        ))}
      </>
    )
  }

  const saveGitAuthor = async () => {
    setError(null)
    setAuthorBusy(true)
    try {
      await window.devxflow.setGitAuthor(authorName, authorEmail)
      setShowGitAuthorDialog(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAuthorBusy(false)
    }
  }

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
      await window.devxflow.addTerminalHistory(termCommand)
      const res = await window.devxflow.runTerminal(repoPath, termCommand)
      setTermResult(res)
      const h = await window.devxflow.getTerminalHistory()
      setTermHistory(h)
      setTermHistoryIndex(-1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTermBusy(false)
    }
  }

  const initTerminal = async () => {
    if (!repoPath) return
    setError(null)
    setTermBusy(true)
    try {
      const pt = await window.devxflow.detectProjectType(repoPath)
      setTermProjectType(pt)
      const sugg = await window.devxflow.getTerminalSuggestions(pt)
      setTermSuggestions(sugg)
      const h = await window.devxflow.getTerminalHistory()
      setTermHistory(h)
      setTermHistoryIndex(-1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTermBusy(false)
    }
  }

  const handleTerminalKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void runTerminal()
      return
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    if (termHistory.length === 0) return
    e.preventDefault()

    if (e.key === 'ArrowUp') {
      const nextIndex = Math.min(termHistoryIndex + 1, termHistory.length - 1)
      setTermHistoryIndex(nextIndex)
      setTermCommand(termHistory[nextIndex] || '')
      return
    }

    const nextIndex = Math.max(termHistoryIndex - 1, -1)
    setTermHistoryIndex(nextIndex)
    if (nextIndex === -1) {
      setTermCommand('')
    } else {
      setTermCommand(termHistory[nextIndex] || '')
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
    setShowSyncDialog(true)
    setSyncStep(0)
  }

  const executeSyncToMain = async () => {
    if (!repoPath || !status) return
    setError(null)
    try {
      // Step 1: Stage all changes
      setSyncStep(1)
      await window.devxflow.stageAll(repoPath)
      // Step 2: Commit with current message
      setSyncStep(2)
      if (commitMessage.trim()) {
        await window.devxflow.commit(repoPath, commitMessage)
      }
      // Step 3: Push current branch
      setSyncStep(3)
      await window.devxflow.push(repoPath, status.branch)
      // Step 4: Switch to main
      setSyncStep(4)
      await window.devxflow.switchBranch(repoPath, 'main')
      // Step 5: Merge feature branch
      setSyncStep(5)
      await window.devxflow.merge(repoPath, status.branch)
      // Step 6: Push main
      setSyncStep(6)
      await window.devxflow.push(repoPath, 'main')
      // Step 7: Pull latest
      setSyncStep(7)
      await window.devxflow.pull(repoPath, 'merge')
      // Step 8: Switch back to original branch
      setSyncStep(8)
      await window.devxflow.switchBranch(repoPath, status.branch)
      setCommitMessage('')
      await refreshStatus(repoPath)
      setShowSyncDialog(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setShowSyncDialog(false)
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
              onClick={() => {
                setActiveTab(t)
                if (t === 'Terminal') void initTerminal()
              }}
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
                <button type="button" className="btn btn-secondary" onClick={() => void openGitAuthorDialog()}>
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
                  <select
                    className="commit-input"
                    aria-label="Project Type"
                    value={termProjectType}
                    onChange={async (e) => {
                      const pt = e.target.value as typeof termProjectType
                      setTermProjectType(pt)
                      try {
                        const sugg = await window.devxflow.getTerminalSuggestions(pt)
                        setTermSuggestions(sugg)
                      } catch {
                        // ignore
                      }
                    }}
                    disabled={termBusy}
                  >
                    <option value="Laravel">Laravel</option>
                    <option value="Node.js">Node.js</option>
                    <option value="Python">Python</option>
                    <option value="General">General</option>
                  </select>
                  <button type="button" className="btn" onClick={() => void initTerminal()} disabled={termBusy || !repoPath}>
                    Detect
                  </button>
                  <button
                    type="button"
                    className={termSuggestionsEnabled ? 'btn btn-primary' : 'btn'}
                    onClick={() => setTermSuggestionsEnabled((v) => !v)}
                    disabled={termBusy}
                  >
                    Suggestions
                  </button>
                  <input
                    className="commit-input"
                    value={termCommand}
                    onChange={(e) => setTermCommand(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    placeholder="command"
                  />
                  <button type="button" className="btn btn-primary" onClick={runTerminal} disabled={termBusy || !repoPath}>
                    {termBusy ? 'Running…' : 'Run'}
                  </button>
                </div>

                {termSuggestionsEnabled && termSuggestions.length > 0 ? (
                  <div className="diff-panel" aria-label="Terminal suggestions">
                    <div className="diff-title">Suggestions</div>
                    <div className="stash-list">
                      {termSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="history-item"
                          onClick={() => setTermCommand(s)}
                          disabled={termBusy}
                        >
                          <div className="history-msg">{s}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="diff-panel" aria-label="Terminal output">
                  <div className="diff-title">Output {termResult ? `(code: ${String(termResult.code)})` : ''}</div>
                  <pre className="diff-body">
                    {renderTerminalOutput()}
                  </pre>
                </div>

                {error ? <div className="panel-error">{error}</div> : null}
                <div className="panel-hint">Terminal baseline: run one command in repo cwd and capture stdout/stderr.</div>
              </div>
            ) : activeTab === 'Debug' ? (
              <div style={{ height: '100%', padding: '16px' }}>
                <DebugMonitor repoPath={repoPath} />
              </div>
            ) : activeTab === 'Diff Viewer' ? (
              <div style={{ height: '100%', padding: '16px' }}>
                <DiffViewer
                  repoPath={repoPath}
                  changes={changes}
                  onRefresh={() => repoPath && void refreshStatus(repoPath)}
                  getDiff={async (filePath, leftRef, rightRef) => {
                    if (!repoPath) return ''
                    // Use the existing getDiff IPC - rightRef indicates staged mode
                    const mode = rightRef === '--cached' ? 'staged' : 'unstaged'
                    return await window.devxflow.getDiff(repoPath, filePath, mode)
                  }}
                  isLoading={dvBusy}
                />
              </div>
            ) : activeTab === 'Merge Resolver' ? (
              <div style={{ height: '100%', padding: '16px' }}>
                <MergeResolver
                  repoPath={repoPath}
                  conflictedFiles={mrFiles}
                  onRefresh={() => repoPath && void refreshMergeResolver()}
                  isLoading={mrBusy}
                />
              </div>
            ) : activeTab === 'Rebase' ? (
              <div style={{ height: '100%', padding: '16px' }}>
                <RebaseUI
                  repoPath={repoPath}
                  rebaseStatus={rbStatus}
                  onRefresh={() => repoPath && void refreshRebase()}
                  onContinue={() => void runRebaseAction('continue')}
                  onSkip={() => void runRebaseAction('skip')}
                  onAbort={() => void runRebaseAction('abort')}
                  isLoading={rbBusy}
                />
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

      {showGitAuthorDialog ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Git Author">
          <div className="modal">
            <div className="modal-title">Git Author</div>
            <div className="modal-body">
              <label className="modal-label" htmlFor="author-name">
                Name
              </label>
              <input
                id="author-name"
                className="commit-input"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your Name"
                disabled={authorBusy}
              />
              <label className="modal-label" htmlFor="author-email">
                Email
              </label>
              <input
                id="author-email"
                className="commit-input"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={authorBusy}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowGitAuthorDialog(false)} disabled={authorBusy}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void saveGitAuthor()} disabled={authorBusy}>
                {authorBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSyncDialog ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Sync to Main">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-title">Sync to Main Workflow</div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#888888' }}>
                This will execute the following steps to sync your feature branch to main:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {syncSteps.map((step, index) => (
                  <div
                    key={step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      background: syncStep === 0 ? 'transparent' : syncStep > index ? 'rgba(0, 255, 136, 0.1)' : syncStep === index + 1 ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      border: syncStep === index + 1 ? '1px solid var(--accent)' : '1px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: syncStep > index + 1 ? 'var(--success)' : syncStep === index + 1 ? 'var(--accent)' : 'var(--panel)',
                        color: syncStep > index + 1 || syncStep === index + 1 ? '#000' : '#888',
                      }}
                    >
                      {syncStep > index + 1 ? '✓' : index + 1}
                    </span>
                    <span style={{ color: syncStep === index + 1 ? 'var(--text)' : '#888' }}>{step}</span>
                  </div>
                ))}
              </div>
              {syncStep > 0 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '4px',
                      background: 'var(--panel)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(syncStep / syncSteps.length) * 100}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <p style={{ marginTop: '8px', color: 'var(--accent)', fontSize: '12px' }}>
                    Step {syncStep} of {syncSteps.length}: {syncSteps[syncStep - 1]}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              {syncStep === 0 ? (
                <>
                  <button type="button" className="btn" onClick={() => setShowSyncDialog(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-success" onClick={() => void executeSyncToMain()}>
                    Start Sync
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => setShowSyncDialog(false)} disabled={syncStep > 0 && syncStep < syncSteps.length}>
                  {syncStep >= syncSteps.length ? 'Close' : 'Running...'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
