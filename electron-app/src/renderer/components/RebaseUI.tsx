import { useState, useCallback } from 'react'

interface RebaseUIProps {
  repoPath: string
  rebaseStatus: {
    inProgress: boolean
    type: 'rebase-apply' | 'rebase-merge' | null
    headName: string | null
    onto: string | null
    step: number | null
    total: number | null
  } | null
  onRefresh: () => void
  onContinue: () => void
  onSkip: () => void
  onAbort: () => void
  isLoading: boolean
}

type RebaseAction = 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'

interface RebaseCommit {
  action: RebaseAction
  hash: string
  message: string
}

export function RebaseUI({ repoPath, rebaseStatus, onRefresh, onContinue, onSkip, onAbort, isLoading }: RebaseUIProps) {
  const [commits, setCommits] = useState<RebaseCommit[]>([])
  const [baseCommit, setBaseCommit] = useState('HEAD~10')
  const [isLoadingCommits, setIsLoadingCommits] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const loadCommits = useCallback(async () => {
    if (!repoPath) return
    setIsLoadingCommits(true)
    setError(null)
    setActionMessage(null)
    try {
      const result = await window.devxflow.loadRebaseCommits(repoPath, baseCommit || undefined)
      setCommits(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoadingCommits(false)
    }
  }, [repoPath, baseCommit])

  const handleActionChange = (index: number, newAction: RebaseAction) => {
    setCommits(prev => prev.map((c, i) => i === index ? { ...c, action: newAction } : c))
  }

  const handleStartRebase = async () => {
    if (!repoPath || commits.length === 0) return
    setIsLoadingCommits(true)
    setError(null)
    setActionMessage(null)
    try {
      const result = await window.devxflow.startInteractiveRebase(repoPath, commits)
      setActionMessage(result)
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoadingCommits(false)
    }
  }

  const handleUpdateTodo = async () => {
    if (!repoPath || !rebaseStatus?.inProgress) return
    setIsLoadingCommits(true)
    setError(null)
    setActionMessage(null)
    try {
      await window.devxflow.writeRebaseTodo(repoPath, commits)
      setActionMessage('✓ Updated rebase todo file')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoadingCommits(false)
    }
  }

  const actionOptions: { value: RebaseAction; label: string; desc: string }[] = [
    { value: 'pick', label: 'pick', desc: 'Use commit' },
    { value: 'reword', label: 'reword', desc: 'Use commit, but edit message' },
    { value: 'edit', label: 'edit', desc: 'Use commit, but stop for amending' },
    { value: 'squash', label: 'squash', desc: 'Use commit, but meld into previous' },
    { value: 'fixup', label: 'fixup', desc: 'Like squash, but discard message' },
    { value: 'drop', label: 'drop', desc: 'Remove commit' },
  ]

  const getActionColor = (action: RebaseAction): string => {
    switch (action) {
      case 'pick': return '#4ec9b0'
      case 'reword': return '#007acc'
      case 'edit': return '#ce9178'
      case 'squash': return '#b5cea8'
      case 'fixup': return '#dcdcaa'
      case 'drop': return '#f48771'
    }
  }

  return (
    <div className="panel-grid">
      {/* Status bar */}
      <div className="working-tree-toolbar">
        {rebaseStatus?.inProgress ? (
          <span className="text-warning" style={{ fontWeight: 'bold' }}>
            ⚠️ Rebase in progress: {rebaseStatus.headName} onto {rebaseStatus.onto}
            {rebaseStatus.step !== null && rebaseStatus.total !== null &&
              ` (step ${rebaseStatus.step}/${rebaseStatus.total})`}
          </span>
        ) : (
          <span className="text-success" style={{ fontWeight: 'bold' }}>
            ✓ No rebase in progress
          </span>
        )}

        <div className="toolbar-actions" style={{ marginLeft: 'auto' }}>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? '⏳ ...' : '↻ Refresh'}
          </button>

          {rebaseStatus?.inProgress && (
            <>
              <button
                onClick={onContinue}
                disabled={isLoading}
                className="btn btn-success"
              >
                Continue
              </button>
              <button
                onClick={onSkip}
                disabled={isLoading}
                className="btn btn-warning"
              >
                Skip
              </button>
              <button
                onClick={onAbort}
                disabled={isLoading}
                className="btn btn-danger"
              >
                Abort
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error/Action messages */}
      {error && (
        <div className="panel-error-message">
          ❌ {error}
        </div>
      )}
      {actionMessage && (
        <div className="panel-success-message">
          {actionMessage}
        </div>
      )}

      {/* Commit loading controls */}
      {!rebaseStatus?.inProgress && (
        <div className="working-tree-toolbar">
          <span className="toolbar-label">Base commit:</span>
          <input
            type="text"
            value={baseCommit}
            onChange={(e) => setBaseCommit(e.target.value)}
            placeholder="HEAD~10 or commit hash"
            className="commit-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={loadCommits}
            disabled={isLoadingCommits || !repoPath}
            className="btn btn-primary"
          >
            {isLoadingCommits ? '⏳ Loading...' : 'Load Commits'}
          </button>
        </div>
      )}

      {/* Commits list */}
      <div className="rebase-commits-list">
        {commits.length === 0 ? (
          <div className="diff-empty">
            {rebaseStatus?.inProgress
              ? 'Rebase in progress. Use Continue/Skip/Abort to proceed.'
              : 'Load commits to start an interactive rebase.'}
          </div>
        ) : (
          <div className="rebase-commits-container">
            {commits.map((commit, index) => (
              <div
                key={commit.hash}
                className={commit.action === 'drop' ? 'rebase-commit-item drop' : 'rebase-commit-item'}
              >
                <span className="rebase-commit-index">{index + 1}</span>
                <select
                  value={commit.action}
                  onChange={(e) => handleActionChange(index, e.target.value as RebaseAction)}
                  disabled={rebaseStatus?.inProgress}
                  className="rebase-action-select"
                  style={{ background: getActionColor(commit.action) }}
                  title="Rebase action"
                >
                  {actionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className={commit.action === 'drop' ? 'rebase-commit-message drop' : 'rebase-commit-message'}>
                  <span className="rebase-commit-hash">{commit.hash.slice(0, 7)}</span> {commit.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {commits.length > 0 && !rebaseStatus?.inProgress && (
        <div className="working-tree-toolbar">
          <button
            onClick={handleStartRebase}
            disabled={isLoadingCommits || commits.length === 0}
            className="btn btn-success"
            style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 'bold' }}
          >
            🚀 Start Interactive Rebase
          </button>
        </div>
      )}

      {rebaseStatus?.inProgress && commits.length > 0 && (
        <div className="working-tree-toolbar">
          <button
            onClick={handleUpdateTodo}
            disabled={isLoadingCommits}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 'bold' }}
          >
            💾 Update Rebase Todo
          </button>
        </div>
      )}
    </div>
  )
}
