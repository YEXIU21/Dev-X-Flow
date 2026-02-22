import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { DebugMonitor } from './components/DebugMonitor'
import { MergeResolver } from './components/MergeResolver'
import { RebaseUI } from './components/RebaseUI'
import { DiffViewer } from './components/DiffViewer'
import { LicenseModal } from './components/LicenseModal'
import { UpgradePrompt } from './components/UpgradePrompt'
import { TrialBadge } from './components/TrialBadge'
import { Button } from './design-system/components/Button'
import { Input } from './design-system/components/Input'
import { Modal } from './design-system/components/Modal'

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

  const showHints = false

  const [activeTab, setActiveTab] = useState<AppTab>('Status & Commit')
  const [repoPath, setRepoPath] = useState('D:\\projects\\devxflow\\repo')
  const [status, setStatus] = useState<{
    branch: string
    staged: number
    modified: number
    created: number
    deleted: number
    renamed: number
    conflicted: number
    ahead: number
    behind: number
  } | null>(null)
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
  const [historyGraph, setHistoryGraph] = useState<string>('')
  const [showHistoryGraph, setShowHistoryGraph] = useState<boolean>(true)
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
  const [dbEngine, setDbEngine] = useState<'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'>('sqlite')
  const [dbPath, setDbPath] = useState('')
  const [dbHost, setDbHost] = useState('127.0.0.1')
  const [dbPort, setDbPort] = useState('')
  const [dbUser, setDbUser] = useState('root')
  const [dbPassword, setDbPassword] = useState('')
  const [dbDatabase, setDbDatabase] = useState('')
  const [dbConnectionKey, setDbConnectionKey] = useState<string | null>(null)
  const [dbSql, setDbSql] = useState('select 1 as ok;')
  const [dbResult, setDbResult] = useState<string>('')
  const [dbSqlFile, setDbSqlFile] = useState<string>('')
  const [dbSqlTables, setDbSqlTables] = useState<string[]>([])
  // Additional Database tab state for Python GUI parity
  const [dbUseCustomPort, setDbUseCustomPort] = useState(false)
  const [dbNewName, setDbNewName] = useState('')
  const [dbDropdownValue, setDbDropdownValue] = useState('')
  const [dbDropdownOptions, setDbDropdownOptions] = useState<string[]>([])
  const [dbStatus, setDbStatus] = useState('● Database System: Ready')
  const [dbOutput, setDbOutput] = useState<{ text: string; level: 'info' | 'success' | 'error' | 'warning' }[]>([])
  const [dbMysqlExe, setDbMysqlExe] = useState('')
  const [dbSqlServerDriver, setDbSqlServerDriver] = useState('ODBC Driver 17 for SQL Server')
  const [dbTestBusy, setDbTestBusy] = useState(false)
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false)
  const [ctTableName, setCtTableName] = useState('')
  const [ctColumnsText, setCtColumnsText] = useState('id INT pk notnull\nname VARCHAR(255) notnull')
  const [ctSqlPreview, setCtSqlPreview] = useState('')
  const [ctBusy, setCtBusy] = useState(false)
  const [showSelectiveRestoreDialog, setShowSelectiveRestoreDialog] = useState(false)
  const [srSelectedTables, setSrSelectedTables] = useState<string[]>([])
  const [srBusy, setSrBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // License state
  const [licenseTier, setLicenseTier] = useState<'free' | 'pro' | 'pro_plus' | 'teams'>('free')
  const [licenseValid, setLicenseValid] = useState(false)
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [licenseModalMode, setLicenseModalMode] = useState<'welcome' | 'input' | 'trial'>('welcome')
  const [upgradeFeature, setUpgradeFeature] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  // Dialog visibility states
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [showSwitchBranchDialog, setShowSwitchBranchDialog] = useState(false)
  const [showDeleteBranchDialog, setShowDeleteBranchDialog] = useState(false)
  const [showGitAuthorDialog, setShowGitAuthorDialog] = useState(false)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [branchBusy, setBranchBusy] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [switchBranchName, setSwitchBranchName] = useState('')
  const [deleteBranchName, setDeleteBranchName] = useState('')
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

  const clearTerminal = () => {
    setError(null)
    setTermResult(null)
    setTermCommand('')
    setTermHistoryIndex(-1)
  }

  useEffect(() => {
    const isEditable = (el: Element | null) => {
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if ((el as HTMLElement).isContentEditable) return true
      return false
    }

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (isEditable(document.activeElement)) return

      const key = e.key.toLowerCase()
      const ctrlOrMeta = e.ctrlKey || e.metaKey

      if (ctrlOrMeta && key === 'o') {
        e.preventDefault()
        void handlePickRepo()
        return
      }

      if (ctrlOrMeta && key === 'r') {
        e.preventDefault()
        if (repoPath) void refreshStatus(repoPath)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [repoPath])

  // License initialization
  useEffect(() => {
    const initLicense = async () => {
      try {
        const status = await window.devxflow.licenseCheck()
        if (status.valid && status.tier) {
          setLicenseValid(true)
          setLicenseTier(status.tier as 'free' | 'pro' | 'pro_plus' | 'teams')
          setLicenseExpiresAt(status.expires_at || null)
        } else {
          // Show welcome modal on first launch
          setLicenseModalMode('welcome')
          setShowLicenseModal(true)
        }
      } catch (e) {
        console.error('License check failed:', e)
        setLicenseModalMode('welcome')
        setShowLicenseModal(true)
      }
    }

    void initLicense()

    // Listen for license status updates
    const unsubscribe = window.devxflow.onLicenseStatus((status) => {
      setLicenseValid(status.valid)
      setLicenseTier(status.tier as 'free' | 'pro' | 'pro_plus' | 'teams')
      setLicenseExpiresAt(status.expires_at || null)
    })

    // Listen for menu events
    const handleMenuShowLicense = () => {
      setLicenseModalMode('welcome')
      setShowLicenseModal(true)
    }

    const handleMenuShowActivate = () => {
      setLicenseModalMode('input')
      setShowLicenseModal(true)
    }

    const handleMenuDeactivate = async () => {
      await window.devxflow.licenseDeactivate()
      setLicenseValid(false)
      setLicenseTier('free')
      setLicenseExpiresAt(null)
    }

    window.addEventListener('license:show-modal', handleMenuShowLicense)
    window.addEventListener('license:show-activate', handleMenuShowActivate)
    window.addEventListener('license:deactivate', handleMenuDeactivate)

    return () => {
      unsubscribe()
      window.removeEventListener('license:show-modal', handleMenuShowLicense)
      window.removeEventListener('license:show-activate', handleMenuShowActivate)
      window.removeEventListener('license:deactivate', handleMenuDeactivate)
    }
  }, [])

  // License activation handler
  const handleLicenseActivate = async (licenseKey: string) => {
    const result = await window.devxflow.licenseActivate(licenseKey)
    if (result.valid) {
      setLicenseValid(true)
      setLicenseTier(result.tier as 'free' | 'pro' | 'pro_plus' | 'teams')
      setLicenseExpiresAt(result.expires_at || null)
      setShowLicenseModal(false)
    }
    return result
  }

  // Check feature availability
  const checkFeature = async (feature: string): Promise<boolean> => {
    const result = await window.devxflow.licenseCheckFeature(feature)
    return result.available
  }

  // Handle feature click with gating
  const handleFeatureClick = async (feature: string, requiredTier: 'free' | 'pro' | 'pro_plus' | 'teams') => {
    const available = await checkFeature(feature)
    if (!available) {
      setUpgradeFeature(feature)
      setShowUpgradePrompt(true)
      return false
    }
    return true
  }

  // Handle upgrade
  const handleUpgrade = () => {
    setShowUpgradePrompt(false)
    void window.devxflow.licenseBuy()
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

  const runCreateBranch = async () => {
    if (!repoPath) return
    setError(null)
    setBranchBusy(true)
    try {
      await window.devxflow.createBranch(repoPath, newBranchName)
      setNewBranchName('')
      setShowBranchDialog(false)
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBranchBusy(false)
    }
  }

  const runSwitchBranch = async () => {
    if (!repoPath) return
    setError(null)
    setBranchBusy(true)
    try {
      await window.devxflow.switchBranch(repoPath, switchBranchName)
      setSwitchBranchName('')
      setShowSwitchBranchDialog(false)
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBranchBusy(false)
    }
  }

  const runDeleteBranch = async () => {
    if (!repoPath) return
    setError(null)
    setBranchBusy(true)
    try {
      await window.devxflow.deleteBranch(repoPath, deleteBranchName)
      setDeleteBranchName('')
      setShowDeleteBranchDialog(false)
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBranchBusy(false)
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

  const handleInitRepo = async () => {
    if (!repoPath) return
    setError(null)
    try {
      await window.devxflow.initRepo(repoPath)
      await refreshStatus(repoPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
      const [items, graph] = await Promise.all([
        window.devxflow.getLog(repoPath, historyCount),
        window.devxflow.getLogGraph(repoPath, historyCount)
      ])
      setLogItems(items)
      setHistoryGraph(graph)
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
      if (!window.devxflow?.detectProjectType || !window.devxflow?.getTerminalSuggestions) {
        throw new Error('Preload API not available: window.devxflow. Terminal features require the preload script to load correctly.')
      }
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

  const handleTerminalKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
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
    if (!window.devxflow?.dbPickSqlite) {
      setError('Database picker not available in browser mode. Run in Electron.')
      return
    }
    const picked = await window.devxflow.dbPickSqlite()
    if (!picked) return
    setDbPath(picked)
  }

  const connectDb = async () => {
    setError(null)
    setDbBusy(true)
    try {
      const portNumber = Number(dbPort || '')
      const port = Number.isFinite(portNumber) ? portNumber : undefined

      const config: { engine: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'; config: Record<string, unknown> } =
        dbEngine === 'sqlite'
          ? { engine: 'sqlite', config: { path: dbPath } }
          : dbEngine === 'mysql'
            ? {
                engine: 'mysql',
                config: {
                  host: dbHost,
                  port: typeof port === 'number' ? port : 3306,
                  user: dbUser,
                  password: dbPassword,
                  database: dbDatabase || undefined,
                },
              }
            : dbEngine === 'postgresql'
              ? {
                  engine: 'postgresql',
                  config: {
                    host: dbHost,
                    port: typeof port === 'number' ? port : 5432,
                    user: dbUser,
                    password: dbPassword,
                    database: dbDatabase || undefined,
                  },
                }
              : {
                  engine: 'sqlserver',
                  config: {
                    server: dbHost,
                    port: typeof port === 'number' ? port : 1433,
                    user: dbUser,
                    password: dbPassword,
                    database: dbDatabase || undefined,
                  },
                }

      const res = await window.devxflow.dbConnect(config)
      if (!res.ok) throw new Error(res.error || 'DB connection failed')
      setDbConnectionKey(res.key)
      setDbResult(`Connected: ${res.key}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const handleDbSelectiveRestore = async () => {
    if (!dbSqlFile) {
      setError('Please select an SQL file first')
      return
    }
    if (!dbConnectionKey) return
    if (!window.devxflow?.dbImportSqlSelective) {
      setError('Selective restore API not available. Rebuild + restart Electron.')
      return
    }
    if (srSelectedTables.length === 0) {
      setError('Please select at least one table')
      return
    }

    setError(null)
    setSrBusy(true)
    setDbBusy(true)
    try {
      const result = await window.devxflow.dbImportSqlSelective(dbConnectionKey, dbSqlFile, srSelectedTables)
      if (result.success) {
        setDbResult(`✅ Selective restore successful!\nImported ${result.tables.length} table(s): ${result.tables.join(', ')}`)
        appendDbOutput(`Selective restore imported ${result.tables.length} tables`, 'success')
        setShowSelectiveRestoreDialog(false)
      } else {
        setError(result.message)
        appendDbOutput(result.message, 'error')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      appendDbOutput(`Error: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setSrBusy(false)
      setDbBusy(false)
    }
  }

  const closeDb = async () => {
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      await window.devxflow.dbDisconnect(dbConnectionKey)
      setDbConnectionKey(null)
      setDbResult('Closed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const runDbQuery = async () => {
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const res = await window.devxflow.dbQuery(dbConnectionKey, dbSql)
      // Format as table-like output for better readability
      if (res.rows && res.rows.length > 0) {
        // Get column names
        const firstRow = res.rows[0] as Record<string, unknown>
        const columns = Object.keys(firstRow)
        let output = `Query returned ${res.rows.length} row(s):\n\n`
        output += columns.join('\t') + '\n'
        output += columns.map(() => '---').join('\t') + '\n'
        for (const row of res.rows) {
          const r = row as Record<string, unknown>
          output += columns.map(c => String(r[c] ?? 'NULL')).join('\t') + '\n'
        }
        setDbResult(output)
      } else {
        setDbResult('Query executed successfully. No rows returned.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setDbResult('')
    } finally {
      setDbBusy(false)
    }
  }

  const handleClearSql = () => {
    setDbSql('')
    setDbResult('')
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
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const ok = await window.devxflow.dbExecute(dbConnectionKey, dbSql)
      setDbResult(JSON.stringify({ ok }, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const handleDbExport = async () => {
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const exportDir = await window.devxflow.dbPickExportDir()
      if (!exportDir) {
        setDbBusy(false)
        return
      }

      const result = await window.devxflow.dbExportToTxt(dbConnectionKey, exportDir)
      setDbResult(`Exported ${result.exported} tables to:\n${result.files.join('\n')}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const handleDbPickSqlFile = async () => {
    const picked = await window.devxflow.dbPickSqlFile()
    if (!picked) return
    setDbSqlFile(picked)
    setDbSqlTables([])
    try {
      const tables = await window.devxflow.dbScanSqlTables(picked)
      setDbSqlTables(tables)
      setDbResult(`SQL file selected: ${picked}\nFound ${tables.length} table(s): ${tables.join(', ')}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleDbImportSql = async () => {
    if (!dbSqlFile) {
      setError('Please select an SQL file first')
      return
    }
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const result = await window.devxflow.dbImportSql(dbConnectionKey, dbSqlFile)
      if (result.success) {
        setDbResult(`✅ Import successful!\nImported ${result.tables.length} table(s): ${result.tables.join(', ')}`)
      } else {
        setError(result.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const handleDbListDatabases = async () => {
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const dbs = await window.devxflow.dbListDatabases(dbConnectionKey)
      if (dbs && dbs.length > 0) {
        setDbResult(`Databases (${dbs.length}):\n${dbs.join('\n')}`)
      } else {
        setDbResult('No databases found or operation not supported for this engine.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbBusy(false)
    }
  }

  const handleDbListTables = async () => {
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const tables = await window.devxflow.dbListTables(dbConnectionKey)
      if (tables && tables.length > 0) {
        setDbResult(`Tables (${tables.length}):\n${tables.join('\n')}`)
        appendDbOutput(`Found ${tables.length} tables`, 'success')
      } else {
        setDbResult('No tables found in current database.')
        appendDbOutput('No tables found', 'warning')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      appendDbOutput(`Error: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setDbBusy(false)
    }
  }

  // Helper to append colored output messages
  const appendDbOutput = (text: string, level: 'info' | 'success' | 'error' | 'warning') => {
    setDbOutput(prev => [...prev, { text, level }])
  }

  const validateDbIdentifier = (name: string) => {
    const n = (name || '').trim()
    if (!n) return { ok: false, message: 'Error: Name is required.' }
    if (n.length > 128) return { ok: false, message: 'Error: Name is too long.' }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) return { ok: false, message: 'Error: Name must match ^[A-Za-z_][A-Za-z0-9_]*$' }
    return { ok: true as const, message: 'OK' }
  }

  const quoteIdent = (name: string) => {
    const n = (name || '').trim()
    if (!n) return '``'
    return '`' + n.replace(/`/g, '``') + '`'
  }

  const buildCreateTableSql = () => {
    const table = (ctTableName || '').trim()
    const v = validateDbIdentifier(table)
    if (!v.ok) return { sql: null as string | null, error: v.message }

    const lines = (ctColumnsText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return { sql: null, error: 'Error: At least one column is required.' }

    const cols: string[] = []
    const pkCols: string[] = []

    for (const line of lines) {
      const parts = line.split(/\s+/).filter(Boolean)
      if (parts.length < 2) return { sql: null, error: `Error: Invalid column line: ${line}` }

      const colName = parts[0]
      const type = parts[1]
      const flags = parts.slice(2).map((p) => p.toLowerCase())

      const cv = validateDbIdentifier(colName)
      if (!cv.ok) return { sql: null, error: cv.message }

      const notNull = flags.includes('notnull') || flags.includes('nn')
      const pk = flags.includes('pk') || flags.includes('primarykey') || (flags.includes('primary') && flags.includes('key'))

      cols.push(`${quoteIdent(colName)} ${type}${notNull ? ' NOT NULL' : ''}`)
      if (pk) pkCols.push(quoteIdent(colName))
    }

    if (cols.length === 0) return { sql: null, error: 'Error: At least one column is required.' }
    if (pkCols.length > 0) cols.push(`PRIMARY KEY (${pkCols.join(', ')})`)

    const sql = `CREATE TABLE ${quoteIdent(table)} (\n  ${cols.join(',\n  ')}\n);`
    return { sql, error: null as string | null }
  }

  const refreshCreateTablePreview = () => {
    const { sql, error } = buildCreateTableSql()
    if (error) {
      setCtSqlPreview(error)
      return
    }
    setCtSqlPreview(sql || '')
  }

  const executeCreateTable = async () => {
    if (!dbConnectionKey) return
    const { sql, error } = buildCreateTableSql()
    if (error || !sql) {
      appendDbOutput(error || 'Error: Failed to build SQL.', 'error')
      return
    }
    if (!window.devxflow?.dbExecute) {
      setError('Database API not available. Run in Electron.')
      return
    }

    setCtBusy(true)
    try {
      appendDbOutput('🧱 Creating table...', 'info')
      await window.devxflow.dbExecute(dbConnectionKey, sql)
      appendDbOutput('OK', 'success')
      setShowCreateTableDialog(false)
      void handleDbListTables()
    } catch (e) {
      appendDbOutput(`Error: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setCtBusy(false)
    }
  }

  // Test Connection handler
  const handleDbTestConnection = async () => {
    setError(null)
    setDbTestBusy(true)
    try {
      if (!window.devxflow?.dbTestConnection) {
        setError('Database API not available. Run in Electron.')
        setDbTestBusy(false)
        return
      }
      const portNumber = Number(dbPort || '')
      const port = Number.isFinite(portNumber) ? portNumber : undefined

      const config: { engine: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'; config: Record<string, unknown> } =
        dbEngine === 'sqlite'
          ? { engine: 'sqlite', config: { path: dbPath } }
          : dbEngine === 'mysql'
            ? {
                engine: 'mysql',
                config: {
                  host: dbHost,
                  port: dbUseCustomPort && typeof port === 'number' ? port : 3306,
                  user: dbUser,
                  password: dbPassword.trim() ? dbPassword : undefined,
                  database: dbDatabase || undefined,
                },
              }
            : dbEngine === 'postgresql'
              ? {
                  engine: 'postgresql',
                  config: {
                    host: dbHost,
                    port: dbUseCustomPort && typeof port === 'number' ? port : 5432,
                    user: dbUser,
                    password: dbPassword.trim() ? dbPassword : undefined,
                    database: dbDatabase || undefined,
                  },
                }
              : {
                  engine: 'sqlserver',
                  config: {
                    server: dbHost,
                    port: dbUseCustomPort && typeof port === 'number' ? port : 1433,
                    user: dbUser,
                    password: dbPassword.trim() ? dbPassword : undefined,
                    database: dbDatabase || undefined,
                    driver: dbSqlServerDriver,
                  },
                }

      const result = await window.devxflow.dbTestConnection(config)
      if (result.ok) {
        setDbStatus('● Connection: OK')
        appendDbOutput('✅ Connection successful!', 'success')
      } else {
        setDbStatus('● Connection: Failed')
        appendDbOutput(`❌ Connection failed: ${result.error || 'Unknown error'}`, 'error')
      }
    } catch (e) {
      setDbStatus('● Connection: Error')
      appendDbOutput(`❌ Error: ${e instanceof Error ? e.message : String(e)}`, 'error')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDbTestBusy(false)
    }
  }

  // Refresh Database List handler
  const handleDbRefreshList = async () => {
    if (!dbConnectionKey) return
    setError(null)
    setDbBusy(true)
    try {
      const dbs = await window.devxflow.dbListDatabases(dbConnectionKey)
      if (dbs && dbs.length > 0) {
        setDbDropdownOptions(dbs)
        setDbDropdownValue(dbs[0])
        appendDbOutput(`Found ${dbs.length} databases`, 'success')
      } else {
        setDbDropdownOptions([])
        appendDbOutput('No databases found', 'warning')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      appendDbOutput(`Error: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setDbBusy(false)
    }
  }

  // Create Database handler
  const handleDbCreate = async () => {
    if (!dbConnectionKey || !dbNewName.trim()) return
    setError(null)
    setDbBusy(true)
    try {
      const result = await window.devxflow.dbExecute(dbConnectionKey, `CREATE DATABASE ${dbNewName.trim()}`)
      appendDbOutput(`✅ Database '${dbNewName.trim()}' created`, 'success')
      setDbNewName('')
      await handleDbRefreshList()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      appendDbOutput(`❌ Failed to create database: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setDbBusy(false)
    }
  }

  // Drop Database handler
  const handleDbDrop = async () => {
    if (!dbConnectionKey) return
    const targetDb = dbDropdownValue || dbNewName.trim()
    if (!targetDb) return
    if (!confirm(`Drop database '${targetDb}'? This cannot be undone!`)) return
    setError(null)
    setDbBusy(true)
    try {
      const result = await window.devxflow.dbExecute(dbConnectionKey, `DROP DATABASE ${targetDb}`)
      appendDbOutput(`🗑️ Database '${targetDb}' dropped`, 'warning')
      await handleDbRefreshList()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      appendDbOutput(`❌ Failed to drop database: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setDbBusy(false)
    }
  }

  // Save Config handler (saves to localStorage for persistence)
  const handleDbSaveConfig = () => {
    const config = {
      engine: dbEngine,
      host: dbHost,
      port: dbPort,
      useCustomPort: dbUseCustomPort,
      user: dbUser,
      password: dbPassword,
      database: dbDatabase,
      mysqlExe: dbMysqlExe,
      sqlServerDriver: dbSqlServerDriver,
      sqlitePath: dbPath,
    }
    localStorage.setItem('devxflow-db-config', JSON.stringify(config))
    appendDbOutput('✓ Database configuration saved', 'success')
  }

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem('devxflow-db-config')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.engine) setDbEngine(config.engine)
        if (config.host) setDbHost(config.host)
        if (config.port) setDbPort(config.port)
        if (config.useCustomPort !== undefined) setDbUseCustomPort(config.useCustomPort)
        if (config.user) setDbUser(config.user)
        if (config.password) setDbPassword(config.password)
        if (config.database) setDbDatabase(config.database)
        if (config.mysqlExe) setDbMysqlExe(config.mysqlExe)
        if (config.sqlServerDriver) setDbSqlServerDriver(config.sqlServerDriver)
        if (config.sqlitePath) setDbPath(config.sqlitePath)
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    if (dbEngine !== 'mysql') return
    if (dbMysqlExe.trim()) return
    if (!window.devxflow?.dbDetectMysqlExe) return

    let cancelled = false
    void (async () => {
      try {
        const detected = await window.devxflow.dbDetectMysqlExe()
        if (!cancelled && detected) setDbMysqlExe(detected)
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dbEngine, dbMysqlExe])

  const title = useMemo(() => {
    switch (activeTab) {
      case 'Status & Commit':
        return 'Status & Commit'
      case 'History':
        return 'History'
      case 'Remote':
        return 'Remote'
      case 'Stash':
        return 'Stash'
      case 'Terminal':
        return 'Terminal'
      case 'Debug':
        return 'Debug'
      case 'Diff Viewer':
        return 'Diff Viewer'
      case 'Merge Resolver':
        return 'Merge Resolver'
      case 'Rebase':
        return 'Rebase'
      case 'Database':
        return 'Database Tools'
      default:
        return 'Dev-X-Flow-Pro'
    }
  }, [activeTab])

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
        return 'DevXFlow'
    }
  }, [activeTab])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">Dev-X-Flow</div>
        <TrialBadge expiresAt={licenseExpiresAt} tier={licenseTier} />
      </header>

      <div className="main-container">
        {/* Repository Path Section - Web Style */}
        <div className="repo-path-web">
          <div className="repo-path-label">Repository Path</div>
          <div className="repo-path-value-web" title={repoPath}>
            {repoPath || 'No repository selected'}
          </div>
          <div className="repo-path-actions">
            <Button type="button" variant="secondary" size="sm" onClick={handlePickRepo}>
              Browse
            </Button>
            {!status && repoPath ? (
              <Button type="button" variant="primary" size="sm" onClick={() => void handleInitRepo()}>
                Init Repo
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="sm" onClick={() => refreshStatus(repoPath)} disabled={!repoPath}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Current Branch - Web Style */}
        <div className="current-branch-web">
          <div className="branch-label">Current Branch</div>
          <div className="branch-value-web">{status?.branch || 'N/A'}</div>
        </div>

        {/* Tab Navigation - Top tabs like Python TNotebook */}
        <div className="tab-bar">
          {tabs.map((t) => {
            // Determine if tab needs upgrade badge
            const needsPro = ['Debug', 'Diff Viewer', 'Stash'].includes(t)
            const needsProPlus = ['Merge Resolver', 'Rebase'].includes(t)
            const needsTeams = ['Database'].includes(t)
            const showBadge = (needsPro && licenseTier === 'free') ||
                              (needsProPlus && ['free', 'pro'].includes(licenseTier)) ||
                              (needsTeams && ['free', 'pro', 'pro_plus'].includes(licenseTier))

            return (
              <button
                key={t}
                type="button"
                className={t === activeTab ? 'top-tab top-tab-active' : 'top-tab'}
                onClick={async () => {
                  // Check if tab requires higher tier
                  const needsPro = ['Debug', 'Diff Viewer', 'Stash'].includes(t)
                  const needsProPlus = ['Merge Resolver', 'Rebase'].includes(t)
                  const needsTeams = ['Database'].includes(t)
                  const isLocked = (needsPro && licenseTier === 'free') ||
                                   (needsProPlus && ['free', 'pro'].includes(licenseTier)) ||
                                   (needsTeams && ['free', 'pro', 'pro_plus'].includes(licenseTier))

                  if (isLocked) {
                    // Show upgrade prompt instead of switching tab
                    let requiredTier: 'pro' | 'pro_plus' | 'teams' = 'pro'
                    if (needsProPlus) requiredTier = 'pro_plus'
                    if (needsTeams) requiredTier = 'teams'

                    setUpgradeFeature(t)
                    setShowUpgradePrompt(true)
                    return
                  }

                  // Allow tab switch for unlocked tabs
                  setActiveTab(t)
                  if (t === 'Terminal') void initTerminal()
                }}
              >
                {t}
                {showBadge && <span className="tab-upgrade-badge">UPGRADE</span>}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'Status & Commit' ? (
            <div className="status-web-layout">
              {/* Working Tree Panel */}
              <div className="working-tree-panel">
                {/* Action Toolbar above Working Tree */}
                <div className="working-tree-toolbar">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowBranchDialog(true)}>
                    + New Branch
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowSwitchBranchDialog(true)}>
                    Switch Branch
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowDeleteBranchDialog(true)}>
                    Delete Branch
                  </Button>
                  <Button 
                    type="button" 
                    variant="ai-prominent" 
                    size="sm" 
                    onClick={handleAiGenerate} 
                    disabled={aiBusy || !repoPath}
                    className="btn-ai-prominent"
                  >
                    {aiBusy ? '✨ Analyzing...' : '✨ AI Generate'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="sync" 
                    size="sm" 
                    onClick={handleSyncToMain}
                    disabled={!repoPath || !status || status.branch === 'main' || status.branch === 'master'}
                  >
                    ⚡ Sync to Main
                  </Button>
                </div>

                {/* Git Status Output - Terminal Style */}
                <div className="working-tree-content">
                  <div className="working-tree-header">Working Tree</div>
                  <pre className="working-tree-terminal">
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
              </div>

              {/* Commit Section - Bottom */}
              <div className="commit-section-web">
                <div className="commit-input-row">
                  <input
                    className="commit-input-web"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Enter commit message..."
                  />
                </div>
                <div className="commit-actions-row">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleStageAll}
                    disabled={!repoPath || (unstagedChanges.length === 0 && changes.filter((c) => c.index === '?').length === 0)}
                  >
                    Stage All
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={handleCommit} disabled={!commitMessage.trim() || !repoPath || stagedChanges.length === 0}>
                    Commit
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={handlePush} disabled={!repoPath || !status}>
                    Push
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void openGitAuthorDialog()}>
                    Author
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === 'History' ? (
              <div className="history-grid">
                {/* Compact Toolbar */}
                <div className="working-tree-toolbar">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowHistoryGraph((prev) => !prev)}
                    disabled={historyBusy || !repoPath}
                  >
                    {showHistoryGraph ? '📊 Graph' : '📋 List'}
                  </Button>
                  <Input
                    className="commit-input"
                    size="sm"
                    value={String(historyCount)}
                    onChange={(e) => setHistoryCount(Number(e.target.value || '50'))}
                    placeholder="50"
                    inputMode="numeric"
                  />
                  <Button type="button" variant="primary" size="sm" onClick={refreshHistory} disabled={historyBusy || !repoPath}>
                    {historyBusy ? 'Loading…' : 'Refresh'}
                  </Button>
                </div>

                {showHistoryGraph && historyGraph ? (
                  <div className="diff-panel" aria-label="Commit graph">
                    <div className="diff-title">Commit Graph (all branches)</div>
                    <pre className="diff-body history-graph-pre">{historyGraph}</pre>
                  </div>
                ) : (
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
                )}

                {showHints ? (
                  <div className="panel-hint">History: Toggle between graph view (all branches) and list view.</div>
                ) : null}
              </div>
            ) : activeTab === 'Remote' ? (
              <div className="remote-grid">
                {/* Compact Toolbar */}
                <div className="working-tree-toolbar">
                  <Button type="button" variant="secondary" size="sm" onClick={refreshRemotes} disabled={remoteBusy || !repoPath}>
                    {remoteBusy ? 'Loading…' : 'Refresh'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => runRemoteAction(() => window.devxflow.pull(repoPath, 'merge'))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Pull
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => runRemoteAction(() => window.devxflow.fetch(repoPath))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Fetch
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => runRemoteAction(() => window.devxflow.push(repoPath))}
                    disabled={remoteBusy || !repoPath}
                  >
                    Push
                  </Button>
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
                      <Input
                        className="commit-input"
                        size="sm"
                        value={remoteName}
                        onChange={(e) => setRemoteName(e.target.value)}
                        placeholder="origin"
                      />
                      <Input
                        className="commit-input"
                        size="sm"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                        placeholder="https://github.com/user/repo.git"
                      />
                      <Button type="button" variant="primary" size="sm" onClick={handleAddRemote} disabled={remoteBusy || !remoteUrl.trim()}>
                        + Add Remote
                      </Button>
                    </div>
                  </div>

                  <div className="diff-panel" aria-label="Remote output">
                    <div className="diff-title">Output</div>
                    <pre className="diff-body">{remoteOutput || 'Run Fetch/Pull/Push to see output.'}</pre>
                  </div>
                </div>

                {showHints ? <div className="panel-hint">Remote baseline: list remotes, add remote, fetch/pull/push.</div> : null}
              </div>
            ) : activeTab === 'Stash' ? (
              <div className="stash-grid">
                {/* Compact Toolbar */}
                <div className="working-tree-toolbar">
                  <Button type="button" variant="secondary" size="sm" onClick={refreshStashes} disabled={stashBusy || !repoPath}>
                    {stashBusy ? 'Loading…' : 'Refresh'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => runStashAction(() => window.devxflow.stashSave(repoPath, stashMessage))}
                    disabled={stashBusy || !repoPath}
                  >
                    Save
                  </Button>
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
                      <Input
                        className="commit-input"
                        size="sm"
                        value={stashMessage}
                        onChange={(e) => setStashMessage(e.target.value)}
                        placeholder="WIP message"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => runStashAction(() => window.devxflow.stashSave(repoPath, stashMessage))}
                        disabled={stashBusy || !repoPath}
                      >
                        Save
                      </Button>
                    </div>

                    <div className="stash-actions">
                      <Input
                        className="commit-input"
                        size="sm"
                        value={stashIndex === '' ? '' : String(stashIndex)}
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          if (!v) return setStashIndex('')
                          setStashIndex(Number(v))
                        }}
                        placeholder="index (optional)"
                        inputMode="numeric"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => runStashAction(() => window.devxflow.stashApply(repoPath, normalizeStashIndex()))}
                        disabled={stashBusy || !repoPath}
                      >
                        Apply
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => runStashAction(() => window.devxflow.stashPop(repoPath, normalizeStashIndex()))}
                        disabled={stashBusy || !repoPath}
                      >
                        Pop
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => runStashAction(() => window.devxflow.stashDrop(repoPath, normalizeStashIndex()))}
                        disabled={stashBusy || !repoPath}
                      >
                        Drop
                      </Button>
                    </div>
                  </div>

                  <div className="diff-panel" aria-label="Stash output">
                    <div className="diff-title">Output</div>
                    <pre className="diff-body">{stashOutput || 'Run Save/Apply/Pop/Drop to see output.'}</pre>
                  </div>
                </div>

                {showHints ? <div className="panel-hint">Stash baseline: list + save + apply/pop/drop.</div> : null}
              </div>

            ) : activeTab === 'Terminal' ? (
              <div className="terminal-grid">
                {/* Compact Toolbar */}
                <div className="working-tree-toolbar">
                  <select
                    className="commit-input ds-input ds-input-sm"
                    aria-label="Project Type"
                    value={termProjectType}
                    onChange={async (e) => {
                      const pt = e.target.value as typeof termProjectType
                      setTermProjectType(pt)
                      const sugg = await window.devxflow.getTerminalSuggestions(pt)
                      setTermSuggestions(sugg)
                    }}
                  >
                    <option value="Laravel">Laravel</option>
                    <option value="Node.js">Node.js</option>
                    <option value="Python">Python</option>
                    <option value="General">General</option>
                  </select>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void initTerminal()} disabled={termBusy || !repoPath}>
                    Detect
                  </Button>
                  <Input
                    className="commit-input"
                    size="sm"
                    value={termCommand}
                    onChange={(e) => setTermCommand(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    placeholder="command"
                  />
                  <Button type="button" variant="primary" size="sm" onClick={runTerminal} disabled={termBusy || !repoPath}>
                    {termBusy ? 'Running…' : 'Run'}
                  </Button>
                </div>

                <div className="terminal-split">
                  {termSuggestionsEnabled && termSuggestions.length > 0 ? (
                    <div className="diff-panel" aria-label="Terminal suggestions">
                      <div className="diff-title">Quick Commands</div>
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
                  ) : (
                    <div className="diff-panel" aria-label="Terminal placeholder">
                      <div className="diff-title">Quick Commands</div>
                      <div className="changes-empty">Enable suggestions to see quick commands.</div>
                    </div>
                  )}

                  <div className="diff-panel" aria-label="Terminal output">
                    <div className="diff-title">Output {termResult ? `(code: ${String(termResult.code)})` : ''}</div>
                    <pre className="diff-body">{renderTerminalOutput()}</pre>
                  </div>
                </div>

                {showHints ? (
                  <div className="panel-hint">Terminal baseline: run one command in repo cwd and capture stdout/stderr.</div>
                ) : null}
              </div>
            ) : activeTab === 'Debug' ? (
              <div className="feature-pad">
                <DebugMonitor repoPath={repoPath} />
              </div>
            ) : activeTab === 'Diff Viewer' ? (
              <div className="feature-pad">
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
              <div className="feature-pad">
                <MergeResolver
                  repoPath={repoPath}
                  conflictedFiles={mrFiles}
                  onRefresh={() => repoPath && void refreshMergeResolver()}
                  isLoading={mrBusy}
                />
              </div>
            ) : activeTab === 'Rebase' ? (
              <div className="feature-pad">
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
                {/* Connection Configuration Panel - matches Python GUI */}
                <div className="panel">
                  <div className="panel-title">Connection Configuration</div>
                  <div className="db-conn-row">
                    <label className="db-label">DB Type:</label>
                    <select
                      className="ds-input ds-input-sm"
                      aria-label="DB Engine"
                      value={dbEngine}
                      onChange={(e) => {
                        setDbEngine(e.target.value as typeof dbEngine)
                        setDbConnectionKey(null)
                        setDbResult('')
                        setError(null)
                      }}
                    >
                      <option value="sqlite">SQLite</option>
                      <option value="mysql">MySQL/MariaDB</option>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="sqlserver">SQL Server</option>
                    </select>
                    {dbEngine === 'sqlite' ? (
                      <>
                        <Input
                          className="commit-input"
                          size="sm"
                          value={dbPath}
                          onChange={(e) => setDbPath(e.target.value)}
                          placeholder="SQLite .db path"
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={browseDb} disabled={dbBusy}>
                          📂 Browse
                        </Button>
                      </>
                    ) : (
                      <>
                        <label className="db-label">Host:</label>
                        <Input className="commit-input" size="sm" value={dbHost} onChange={(e) => setDbHost(e.target.value)} placeholder="127.0.0.1" />
                        <label className="db-label">User:</label>
                        <Input className="commit-input" size="sm" value={dbUser} onChange={(e) => setDbUser(e.target.value)} placeholder="root" />
                        <label className="db-label">Password:</label>
                        <Input className="commit-input" size="sm" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} placeholder="•••••" type="password" />
                        <label className="db-checkbox">
                          <input type="checkbox" checked={dbUseCustomPort} onChange={(e) => setDbUseCustomPort(e.target.checked)} />
                          Custom Port
                        </label>
                        {dbUseCustomPort && (
                          <Input className="commit-input" size="sm" value={dbPort} onChange={(e) => setDbPort(e.target.value)} placeholder="3306" />
                        )}
                      </>
                    )}
                  </div>
                  {dbEngine === 'mysql' || dbEngine === 'sqlserver' ? (
                    <details className="db-advanced" open={false}>
                      <summary className="db-advanced-summary">Advanced</summary>
                      {dbEngine === 'mysql' && (
                        <div className="db-conn-row">
                          <label className="db-label">mysql.exe:</label>
                          <Input className="commit-input" size="sm" value={dbMysqlExe} onChange={(e) => setDbMysqlExe(e.target.value)} placeholder="(auto-detect)" />
                          <Button type="button" variant="secondary" size="sm" onClick={async () => {
                            if (!window.devxflow?.dbPickMysqlExe) {
                              setError('File picker not available. Run in Electron.')
                              return
                            }
                            const picked = await window.devxflow.dbPickMysqlExe()
                            if (picked) setDbMysqlExe(picked)
                          }} disabled={dbBusy}>
                            📂 Browse
                          </Button>
                        </div>
                      )}
                      {dbEngine === 'sqlserver' && (
                        <div className="db-conn-row">
                          <label className="db-label">SQL Server Driver:</label>
                          <Input className="commit-input" size="sm" value={dbSqlServerDriver} onChange={(e) => setDbSqlServerDriver(e.target.value)} placeholder="ODBC Driver 17 for SQL Server" />
                        </div>
                      )}
                    </details>
                  ) : null}
                  <div className="working-tree-toolbar">
                    <Button type="button" variant="primary" size="sm" onClick={handleDbTestConnection} disabled={dbTestBusy}>
                      {dbTestBusy ? 'Testing…' : '🔗 Test Connection'}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleDbSaveConfig} disabled={dbBusy}>
                      💾 Save Config
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={connectDb} disabled={dbBusy}>
                      {dbBusy ? 'Connecting…' : 'Connect'}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={closeDb} disabled={dbBusy || !dbConnectionKey}>
                      Close
                    </Button>
                    <span className={`db-status ${dbStatus.includes('OK') ? 'db-status-ok' : dbStatus.includes('Failed') ? 'db-status-error' : ''}`}>
                      {dbStatus}
                    </span>
                  </div>
                </div>

                {/* Target Database Panel - matches Python GUI */}
                <div className="panel">
                  <div className="panel-title">Target Database</div>
                  <div className="db-conn-row">
                    <label className="db-label">Database:</label>
                    <select
                      className="ds-input ds-input-sm"
                      aria-label="Select database"
                      value={dbDropdownValue}
                      onChange={(e) => setDbDropdownValue(e.target.value)}
                      disabled={!dbConnectionKey}
                    >
                      <option value="">Select database...</option>
                      {dbDropdownOptions.map(db => <option key={db} value={db}>{db}</option>)}
                    </select>
                    <label className="db-label">New DB:</label>
                    <Input className="commit-input" size="sm" value={dbNewName} onChange={(e) => setDbNewName(e.target.value)} placeholder="new_db_name" disabled={!dbConnectionKey} />
                    <Button type="button" variant="secondary" size="sm" onClick={handleDbRefreshList} disabled={dbBusy || !dbConnectionKey}>
                      🔄 Refresh List
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={handleDbCreate} disabled={dbBusy || !dbConnectionKey || !dbNewName.trim()}>
                      ➕ Create DB
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={handleDbDrop} disabled={dbBusy || !dbConnectionKey}>
                      🗑 Drop DB
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleDbListTables} disabled={dbBusy || !dbConnectionKey}>
                      📊 View Status
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      setCtTableName('')
                      setCtColumnsText('id INT pk notnull\nname VARCHAR(255) notnull')
                      setCtSqlPreview('')
                      setShowCreateTableDialog(true)
                      setTimeout(() => refreshCreateTablePreview(), 0)
                    }} disabled={dbBusy || !dbConnectionKey}>
                      🧱 Create Table
                    </Button>
                  </div>
                </div>

                {/* SQL File Panel - matches Python GUI */}
                <div className="panel">
                  <div className="panel-title">SQL File</div>
                  <div className="db-conn-row">
                    <Input className="commit-input" size="sm" value={dbSqlFile} onChange={(e) => setDbSqlFile(e.target.value)} placeholder="Select SQL file to import..." />
                    <Button type="button" variant="secondary" size="sm" onClick={handleDbPickSqlFile} disabled={dbBusy}>
                      📂 Browse SQL
                    </Button>
                    {dbSqlTables.length > 0 && (
                      <span className="db-tables-hint">Tables: {dbSqlTables.join(', ')}</span>
                    )}
                  </div>
                </div>

                {/* Import Operations Panel - matches Python GUI */}
                <div className="panel">
                  <div className="panel-title">Import Operations</div>
                  <div className="db-actions db-actions-row">
                    <Button type="button" variant="primary" size="sm" onClick={handleDbImportSql} disabled={dbBusy || !dbSqlFile || !dbConnectionKey} className="flex-1">
                      📥 Full Import
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      setError(null)
                      setSrSelectedTables(dbSqlTables.slice(0, 1))
                      setShowSelectiveRestoreDialog(true)
                    }} disabled={dbBusy || !dbSqlFile || !dbConnectionKey || dbSqlTables.length === 0} className="flex-1">
                      🎯 Selective Restore
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleDbExport} disabled={dbBusy || !dbConnectionKey} className="flex-1">
                      📤 Export to TXT
                    </Button>
                  </div>
                </div>

                <div className="db-split">
                  {/* SQL Console Panel */}
                  <div className="diff-panel" aria-label="SQL">
                    <div className="diff-title">SQL / DDL Console</div>
                    <textarea className="commit-input ds-textarea" value={dbSql} onChange={(e) => setDbSql(e.target.value)} rows={8} placeholder="SQL query or command" />
                    <div className="db-actions">
                      <Button type="button" variant="primary" size="sm" onClick={runDbQuery} disabled={dbBusy || !dbConnectionKey}>
                        ▶ Run SQL
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={runDbExec} disabled={dbBusy || !dbConnectionKey}>
                        Exec
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={handleClearSql} disabled={dbBusy}>
                        🧹 Clear
                      </Button>
                    </div>
                  </div>

                  {/* Operation Output Panel - matches Python GUI with color tags */}
                  <div className="diff-panel" aria-label="Operation Output">
                    <div className="diff-title">Operation Output</div>
                    <div className="db-output-log">
                      {dbOutput.length === 0 ? (
                        <div className="changes-empty">Operation output will appear here.</div>
                      ) : (
                        dbOutput.map((item, idx) => (
                          <div key={idx} className={`db-output-line db-output-${item.level}`}>
                            {item.text}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Result Panel */}
                  <div className="diff-panel" aria-label="DB result">
                    <div className="diff-title">Query Result</div>
                    <pre className="diff-body db-result-pre">{dbBusy ? 'Working…' : dbResult || 'Run Query/Exec to see output.'}</pre>
                  </div>
                </div>

                {showHints ? (
                  <div className="panel-hint">
                    Connected: {dbConnectionKey || '—'} | Multi-engine database support: SQLite, MySQL, PostgreSQL, SQL Server
                  </div>
                ) : null}
              </div>
            ) : (
              showHints ? (
                <div className="panel-hint">
                  UI shell created. Next: implement real {activeTab} features from `Dev-X-Flow-Pro/Dev-X-Flow-Pro.py`.
                </div>
              ) : null
            )}
          </div>
      </div>

      {/* Toast notification - floating corner */}
      {error && createPortal(
        <div className="app-notice app-notice-error">
          <span className="app-notice-text">{error}</span>
          <button className="app-notice-close" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>,
        document.body
      )}

      <Modal
        open={showCreateTableDialog}
        title="Create Table"
        ariaLabel="Create Table"
        onClose={() => setShowCreateTableDialog(false)}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateTableDialog(false)} disabled={ctBusy}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => refreshCreateTablePreview()} disabled={ctBusy}>
              Preview
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void executeCreateTable()} disabled={ctBusy || !dbConnectionKey}>
              {ctBusy ? 'Working…' : 'Create'}
            </Button>
          </>
        }
      >
        <label className="modal-label" htmlFor="ct-table-name">Table name</label>
        <Input
          id="ct-table-name"
          className="commit-input"
          size="sm"
          value={ctTableName}
          onChange={(e) => setCtTableName(e.target.value)}
          placeholder="my_table"
          disabled={ctBusy}
        />
        <label className="modal-label" htmlFor="ct-columns">Columns (one per line: name TYPE [pk] [notnull])</label>
        <textarea
          id="ct-columns"
          className="commit-input ds-textarea"
          value={ctColumnsText}
          onChange={(e) => setCtColumnsText(e.target.value)}
          rows={6}
          disabled={ctBusy}
        />
        <label className="modal-label" htmlFor="ct-preview">SQL preview</label>
        <textarea
          id="ct-preview"
          className="commit-input ds-textarea"
          value={ctSqlPreview}
          onChange={(e) => setCtSqlPreview(e.target.value)}
          rows={6}
          disabled={ctBusy}
          placeholder="Click Preview to generate CREATE TABLE SQL"
        />
      </Modal>

      <Modal
        open={showSelectiveRestoreDialog}
        title="Selective Restore"
        ariaLabel="Selective Restore"
        onClose={() => setShowSelectiveRestoreDialog(false)}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowSelectiveRestoreDialog(false)} disabled={srBusy}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void handleDbSelectiveRestore()} disabled={srBusy || !dbConnectionKey || srSelectedTables.length === 0}>
              {srBusy ? 'Working…' : 'Restore'}
            </Button>
          </>
        }
      >
        <div className="sr-meta">SQL file: {dbSqlFile || '—'}</div>
        <div className="sr-meta">Detected tables: {dbSqlTables.length}</div>
        <div className="sr-table-list">
          {dbSqlTables.map((t) => {
            const checked = srSelectedTables.includes(t)
            return (
              <label key={t} className="sr-table-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const on = e.target.checked
                    setSrSelectedTables((prev) => (on ? [...prev, t] : prev.filter((x) => x !== t)))
                  }}
                />
                <span className="sr-table-name">{t}</span>
              </label>
            )
          })}
        </div>
      </Modal>

      <Modal
        open={showGitAuthorDialog}
        title="Git Author"
        ariaLabel="Git Author"
        onClose={() => setShowGitAuthorDialog(false)}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowGitAuthorDialog(false)} disabled={authorBusy}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void saveGitAuthor()} disabled={authorBusy}>
              {authorBusy ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <label className="modal-label" htmlFor="author-name">
          Name
        </label>
        <Input
          id="author-name"
          className="commit-input"
          size="sm"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your Name"
          disabled={authorBusy}
        />
        <label className="modal-label" htmlFor="author-email">
          Email
        </label>
        <Input
          id="author-email"
          className="commit-input"
          size="sm"
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={authorBusy}
        />
      </Modal>

      <Modal
        open={showSyncDialog}
        title="Sync to Main Workflow"
        ariaLabel="Sync to Main"
        onClose={() => setShowSyncDialog(false)}
        className="sync-modal"
        actions={
          syncStep === 0 ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowSyncDialog(false)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => void executeSyncToMain()}>
                Start Sync
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowSyncDialog(false)}
              disabled={syncStep > 0 && syncStep < syncSteps.length}
            >
              {syncStep >= syncSteps.length ? 'Close' : 'Running...'}
            </Button>
          )
        }
      >
        <p className="sync-modal-lead">This will execute the following steps to sync your feature branch to main:</p>
        <div className="sync-steps">
          {syncSteps.map((step, index) => (
            <div
              key={step}
              className={
                syncStep === 0
                  ? 'sync-step'
                  : syncStep > index
                    ? 'sync-step sync-step-done'
                    : syncStep === index + 1
                      ? 'sync-step sync-step-active'
                      : 'sync-step'
              }
            >
              <span
                className={
                  syncStep > index + 1
                    ? 'sync-step-badge sync-step-badge-done'
                    : syncStep === index + 1
                      ? 'sync-step-badge sync-step-badge-active'
                      : 'sync-step-badge'
                }
              >
                {syncStep > index + 1 ? '✓' : index + 1}
              </span>
              <span className={syncStep === index + 1 ? 'sync-step-text sync-step-text-active' : 'sync-step-text'}>{step}</span>
            </div>
          ))}
        </div>
        {syncStep > 0 && (
          <div className="sync-progress">
            <div className="sync-progress-track">
              <div className="sync-progress-bar" style={{ width: `${(syncStep / syncSteps.length) * 100}%` }} />
            </div>
            <p className="sync-progress-text">
              Step {syncStep} of {syncSteps.length}: {syncSteps[syncStep - 1]}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={showBranchDialog}
        title="Create Branch"
        ariaLabel="Create Branch"
        onClose={() => setShowBranchDialog(false)}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowBranchDialog(false)} disabled={branchBusy}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void runCreateBranch()} disabled={branchBusy || !repoPath}>
              {branchBusy ? 'Working…' : 'Create'}
            </Button>
          </>
        }
      >
        <label className="modal-label" htmlFor="branch-create-name">
          Branch name
        </label>
        <Input
          id="branch-create-name"
          className="commit-input"
          size="sm"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          placeholder="feature/my-change"
          disabled={branchBusy}
        />
      </Modal>

      <Modal
        open={showSwitchBranchDialog}
        title="Switch Branch"
        ariaLabel="Switch Branch"
        onClose={() => setShowSwitchBranchDialog(false)}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowSwitchBranchDialog(false)} disabled={branchBusy}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void runSwitchBranch()} disabled={branchBusy || !repoPath}>
              {branchBusy ? 'Working…' : 'Switch'}
            </Button>
          </>
        }
      >
        <label className="modal-label" htmlFor="branch-switch-name">
          Branch name
        </label>
        <Input
          id="branch-switch-name"
          className="commit-input"
          size="sm"
          value={switchBranchName}
          onChange={(e) => setSwitchBranchName(e.target.value)}
          placeholder="main"
          disabled={branchBusy}
        />
      </Modal>

      <Modal
        open={showDeleteBranchDialog}
        title="Delete Branch"
        ariaLabel="Delete Branch"
        onClose={() => setShowDeleteBranchDialog(false)}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowDeleteBranchDialog(false)} disabled={branchBusy}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => void runDeleteBranch()} disabled={branchBusy || !repoPath}>
              {branchBusy ? 'Working…' : 'Delete'}
            </Button>
          </>
        }
      >
        <label className="modal-label" htmlFor="branch-delete-name">
          Branch name
        </label>
        <Input
          id="branch-delete-name"
          className="commit-input"
          size="sm"
          value={deleteBranchName}
          onChange={(e) => setDeleteBranchName(e.target.value)}
          placeholder="feature/old-branch"
          disabled={branchBusy}
        />
      </Modal>

      {/* License Modal */}
      <LicenseModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onActivate={handleLicenseActivate}
        initialMode={licenseModalMode}
      />

      {/* Upgrade Prompt */}
      <UpgradePrompt
        feature={upgradeFeature}
        currentTier={licenseTier}
        requiredTier={upgradeFeature === 'ai_commits' || upgradeFeature === 'database_basic' || upgradeFeature === 'diff_viewer' || upgradeFeature === 'stash_ops' || upgradeFeature === 'debug_monitor' ? 'pro' : upgradeFeature === 'merge_resolver' || upgradeFeature === 'interactive_rebase' || upgradeFeature === 'database_advanced' ? 'pro_plus' : 'teams'}
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
}
