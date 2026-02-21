import { useState, useCallback } from 'react'

interface MergeResolverProps {
  repoPath: string
  conflictedFiles: string[]
  onRefresh: () => void
  isLoading: boolean
}

type ConflictView = 'base' | 'ours' | 'theirs'

export function MergeResolver({ repoPath, conflictedFiles, onRefresh, isLoading }: MergeResolverProps) {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [activeView, setActiveView] = useState<ConflictView>('ours')
  const [content, setContent] = useState<{ base: string; ours: string; theirs: string } | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const loadConflictContent = useCallback(async (filePath: string) => {
    if (!filePath) return
    setIsParsing(true)
    setError(null)
    setActionMessage(null)
    try {
      const result = await window.devxflow.parseConflict(repoPath, filePath)
      setContent(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setContent(null)
    } finally {
      setIsParsing(false)
    }
  }, [repoPath])

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath)
    void loadConflictContent(filePath)
  }

  const handleAcceptSide = async (side: 'ours' | 'theirs') => {
    if (!selectedFile) return
    setIsParsing(true)
    setError(null)
    setActionMessage(null)
    try {
      await window.devxflow.resolveConflict(repoPath, selectedFile, side)
      setActionMessage(`✓ Accepted ${side} version`)
      // Reload to show resolved content
      void loadConflictContent(selectedFile)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsParsing(false)
    }
  }

  const handleMarkResolved = async () => {
    if (!selectedFile) return
    setIsParsing(true)
    setError(null)
    setActionMessage(null)
    try {
      await window.devxflow.markResolved(repoPath, selectedFile)
      setActionMessage('✓ Marked as resolved and staged')
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsParsing(false)
    }
  }

  const handleOpenExternal = async () => {
    if (!selectedFile) return
    const fullPath = `${repoPath}/${selectedFile}`
    try {
      await window.devxflow.openFileExternal(fullPath)
    } catch (e) {
      setError('Could not open file externally')
    }
  }

  const getCurrentContent = () => {
    if (!content) return ''
    return content[activeView]
  }

  const getViewTitle = () => {
    switch (activeView) {
      case 'base': return 'BASE (Common Ancestor)'
      case 'ours': return 'OURS (Your Changes)'
      case 'theirs': return 'THEIRS (Incoming Changes)'
    }
  }

  const getViewColor = () => {
    switch (activeView) {
      case 'base': return '#888888'
      case 'ours': return '#007acc'
      case 'theirs': return '#ce9178'
    }
  }

  return (
    <div className="panel-grid">
      {/* Status bar */}
      <div className="panel-toolbar">
        <span className={conflictedFiles.length > 0 ? 'text-warning' : 'text-success'} style={{ fontWeight: 'bold' }}>
          {conflictedFiles.length > 0
            ? `⚠️ ${conflictedFiles.length} file(s) with conflicts`
            : '✓ No merge conflicts detected'}
        </span>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
        >
          {isLoading ? '⏳ Scanning...' : '🔍 Scan Conflicts'}
        </button>
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

      {/* Main content area */}
      <div className="diff-split">
        {/* File list */}
        <div className="mr-file-list">
          <div className="mr-view-selector" style={{ borderBottom: '1px solid var(--border)', height: '42px', display: 'flex', alignItems: 'center' }}>
            <span className="toolbar-label" style={{ marginLeft: '12px', fontWeight: 'bold' }}>Conflicted Files</span>
          </div>
          <div className="diff-file-items">
            {conflictedFiles.length === 0 ? (
              <div className="diff-empty">No conflicts</div>
            ) : (
              conflictedFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => handleFileSelect(file)}
                  className={selectedFile === file ? 'diff-file-item active' : 'diff-file-item'}
                  style={{ wordBreak: 'break-all' }}
                >
                  {file}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Content view */}
        <div className="mr-content-view">
          {/* View selector */}
          <div className="mr-view-selector" style={{ height: '42px', display: 'flex', alignItems: 'center' }}>
            <span className="toolbar-label" style={{ marginRight: '8px' }}>
              View:
            </span>
            {(['base', 'ours', 'theirs'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                disabled={!selectedFile}
                className={activeView === view ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
              >
                {view}
              </button>
            ))}
            <span className="mr-view-title" style={{ color: getViewColor() }}>
              {getViewTitle()}
            </span>
          </div>

          {/* Content display */}
          <div className="mr-content-display">
            {!selectedFile ? (
              <div className="diff-empty">Select a conflicted file to view</div>
            ) : isParsing ? (
              <div className="diff-empty">Parsing conflict...</div>
            ) : (
              <pre className="mr-pre">
                {getCurrentContent() || '(empty)'}
              </pre>
            )}
          </div>

          {/* Action buttons */}
          <div className="mr-action-bar">
            <button
              onClick={() => handleAcceptSide('ours')}
              disabled={!selectedFile || isParsing}
              className="btn btn-primary"
            >
              ✓ Accept Ours
            </button>
            <button
              onClick={() => handleAcceptSide('theirs')}
              disabled={!selectedFile || isParsing}
              className="btn btn-warning"
            >
              ✓ Accept Theirs
            </button>
            <button
              onClick={handleOpenExternal}
              disabled={!selectedFile}
              className="btn btn-secondary"
            >
              ✎ Edit Manually
            </button>
            <button
              onClick={handleMarkResolved}
              disabled={!selectedFile || isParsing}
              className="btn btn-success"
              style={{ marginLeft: 'auto' }}
            >
              ✓ Mark Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
