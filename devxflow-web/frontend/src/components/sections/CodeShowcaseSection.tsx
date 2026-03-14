import { useEffect, useMemo, useState } from 'react'

type AppPreviewTab =
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

export function CodeShowcaseSection() {
  const tabs: AppPreviewTab[] = useMemo(
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
      'Database'
    ],
    []
  )

  const [activeTab, setActiveTab] = useState<AppPreviewTab>('Status & Commit')
  const [repoPath, setRepoPath] = useState('D:\\projects\\devxflow\\repo')
  const [output, setOutput] = useState(
    'Select a tab to preview the module UI. This is a visual demo (no backend wiring).'
  )

  const [workingDotCount, setWorkingDotCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkingDotCount((c) => (c + 1) % 4)
    }, 450)

    return () => clearInterval(interval)
  }, [])

  const [terminalProjectType, setTerminalProjectType] = useState<'Laravel' | 'Node.js' | 'Python' | 'General'>(
    'Laravel'
  )
  const [diffCompare, setDiffCompare] = useState<'working' | 'staged' | 'HEAD~1' | 'HEAD~2' | 'HEAD~3'>(
    'working'
  )
  const [diffWith, setDiffWith] = useState<'HEAD' | 'HEAD~1' | 'HEAD~2' | 'HEAD~3' | 'origin/main'>(
    'HEAD'
  )

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
        return 'Preview'
    }
  }, [activeTab])

  const handleBrowse = () => {
    setRepoPath('D:\\projects\\devxflow\\example-repo')
    setOutput('Browse: repository path updated.')
  }

  const handleInitRepo = () => {
    setOutput('Init Repo: initialized repository. Current Branch: main')
  }

  const handleAction = (action: string) => {
    setOutput(`${activeTab}: ${action}.`)
  }

  const workingSuffix = useMemo(() => '.'.repeat(workingDotCount), [workingDotCount])

  const statusLine = useMemo(() => {
    switch (activeTab) {
      case 'Status & Commit':
        return `✨ AI analyzing changes${workingSuffix}`
      case 'Terminal':
        return `Running command${workingSuffix}`
      case 'Debug':
        return `Tailing logs${workingSuffix}`
      case 'Database':
        return `Connecting${workingSuffix}`
      default:
        return `Preview running${workingSuffix}`
    }
  }, [activeTab, workingSuffix])

  const renderTabControls = () => {
    switch (activeTab) {
      case 'Status & Commit':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn" type="button" onClick={() => handleAction('+ New Branch')}>
              + New Branch
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Switch Branch')}>
              Switch Branch
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Delete Branch')}>
              Delete Branch
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('AI Generate Commit Message')}>
              ✨ AI Generate
            </button>
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Sync to Main')}>
              ⚡ Sync to Main
            </button>
          </div>
        )
      case 'History':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Refresh Log')}>
              Refresh Log
            </button>
          </div>
        )
      case 'Remote':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Pull (Merge)')}>
              Pull (Merge)
            </button>
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Pull (Rebase)')}>
              Pull (Rebase)
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Fetch')}>
              Fetch
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('+ Add Remote')}>
              + Add Remote
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Refresh Remotes')}>
              Refresh Remotes
            </button>
          </div>
        )
      case 'Stash':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Stash Changes')}>
              💾 Stash Changes
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Pop Stash')}>
              ↩ Pop Stash
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Refresh Stash List')}>
              ↻ Refresh List
            </button>
          </div>
        )
      case 'Terminal':
        return (
          <div className="app-preview-controls">
            <div className="app-preview-control-group">
              <span className="app-preview-control-label">Project Type</span>
              <select
                className="app-preview-select"
                value={terminalProjectType}
                onChange={(e) => setTerminalProjectType(e.target.value as typeof terminalProjectType)}
                aria-label="Project Type"
              >
                <option value="Laravel">Laravel</option>
                <option value="Node.js">Node.js</option>
                <option value="Python">Python</option>
                <option value="General">General</option>
              </select>
            </div>
            <button className="app-preview-btn" type="button" onClick={() => handleAction(`Detect Project (${terminalProjectType})`)}>
              Detect Project
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Clear Terminal')}>
              Clear
            </button>
          </div>
        )
      case 'Debug':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Detect Laravel Log')}>
              Detect Log
            </button>
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Refresh Logs')}>
              Refresh Logs
            </button>
          </div>
        )
      case 'Diff Viewer':
        return (
          <div className="app-preview-controls">
            <div className="app-preview-control-group">
              <span className="app-preview-control-label">Compare</span>
              <select
                className="app-preview-select"
                value={diffCompare}
                onChange={(e) => setDiffCompare(e.target.value as typeof diffCompare)}
                aria-label="Compare source"
              >
                <option value="working">working</option>
                <option value="staged">staged</option>
                <option value="HEAD~1">HEAD~1</option>
                <option value="HEAD~2">HEAD~2</option>
                <option value="HEAD~3">HEAD~3</option>
              </select>
            </div>
            <div className="app-preview-control-group">
              <span className="app-preview-control-label">with</span>
              <select
                className="app-preview-select"
                value={diffWith}
                onChange={(e) => setDiffWith(e.target.value as typeof diffWith)}
                aria-label="Compare target"
              >
                <option value="HEAD">HEAD</option>
                <option value="HEAD~1">HEAD~1</option>
                <option value="HEAD~2">HEAD~2</option>
                <option value="HEAD~3">HEAD~3</option>
                <option value="origin/main">origin/main</option>
              </select>
            </div>
            <button
              className="app-preview-btn app-preview-btn-primary"
              type="button"
              onClick={() => handleAction(`Show Diff (${diffCompare} vs ${diffWith})`)}
            >
              Show Diff
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Refresh Diff')}>
              Refresh
            </button>
          </div>
        )
      case 'Merge Resolver':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Scan Conflicts')}>
              Scan Conflicts
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Mark as Resolved')}>
              Mark Resolved
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Open Merge Tool')}>
              Open Tool
            </button>
          </div>
        )
      case 'Rebase':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Load Commits')}>
              Load Commits
            </button>
          </div>
        )
      case 'Database':
        return (
          <div className="app-preview-controls">
            <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={() => handleAction('Test Connection')}>
              Test Connection
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Refresh List')}>
              Refresh List
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Create DB')}>
              Create DB
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('Drop DB')}>
              Drop DB
            </button>
            <button className="app-preview-btn" type="button" onClick={() => handleAction('View Status')}>
              View Status
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <section className="code-showcase" id="showcase" style={{ background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      <div className="section-title">
        <h2>See It In Action</h2>
        <p>Clean, intuitive interface designed for real developers</p>
      </div>

      <div className="app-preview" aria-label="Dev-X-Flow desktop app UI preview">
        <div className="app-preview-titlebar">
          <div className="app-preview-title">Dev-X-Flow v1.2</div>
          <div className="app-preview-window-actions" aria-hidden="true">
            <span className="app-preview-dot" />
            <span className="app-preview-dot" />
            <span className="app-preview-dot" />
          </div>
        </div>

        <div className="app-preview-body">
          <div className="app-preview-row">
            <div className="app-preview-label">Repository Path</div>
            <div className="app-preview-field">{repoPath}</div>
            <div className="app-preview-actions">
              <button className="app-preview-btn" type="button" onClick={handleBrowse}>
                Browse
              </button>
              <button className="app-preview-btn app-preview-btn-primary" type="button" onClick={handleInitRepo}>
                Init Repo
              </button>
            </div>
          </div>

          <div className="app-preview-row">
            <div className="app-preview-label">Current Branch</div>
            <div className="app-preview-badge">{output.includes('Current Branch: main') ? 'main' : 'N/A'}</div>
          </div>

          <div className="app-preview-tabs" aria-label="Modules">
            {tabs.map((t) => (
              <button
                key={t}
                className={`app-preview-tab${t === activeTab ? ' app-preview-tab-active' : ''}`}
                type="button"
                onClick={() => {
                  setActiveTab(t)
                  setOutput(`${t}: module loaded.`)
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="app-preview-panel">
            <div className="app-preview-toolbar">
              <button
                className="app-preview-btn"
                type="button"
                onClick={() => handleAction(activeTab === 'Rebase' ? 'Start Rebase' : 'Run')}
              >
                {activeTab === 'Rebase' ? 'Start Rebase' : 'Run'}
              </button>
              <button className="app-preview-btn" type="button" onClick={() => handleAction('Abort')}>
                Abort
              </button>
              <button
                className="app-preview-btn app-preview-btn-primary"
                type="button"
                onClick={() => handleAction(activeTab === 'Rebase' ? 'Continue' : 'Apply')}
              >
                {activeTab === 'Rebase' ? 'Continue' : 'Apply'}
              </button>
            </div>
            <div className="app-preview-canvas" aria-label="Preview area">
              <div className="app-preview-muted">{panelTitle}</div>
              <div className="app-preview-canvas-inner">
                {renderTabControls()}
                <div className="app-preview-status">
                  <span className="app-preview-status-dot" aria-hidden="true" />
                  <span className="app-preview-status-text">{statusLine}</span>
                </div>
                <div className="app-preview-output">{output}</div>
                <span className="app-preview-cursor" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
