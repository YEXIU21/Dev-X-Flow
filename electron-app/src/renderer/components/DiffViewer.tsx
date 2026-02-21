import { useState, useMemo, useCallback } from 'react'

interface DiffViewerProps {
  repoPath: string
  changes: Array<{ path: string; index: string; working_dir: string }>
  onRefresh: () => void
  getDiff: (filePath: string, leftRef: string, rightRef: string) => Promise<string>
  isLoading: boolean
}

type CompareMode = 'working-vs-staged' | 'working-vs-head' | 'staged-vs-head' | 'custom'

interface DiffLine {
  type: 'header' | 'add' | 'remove' | 'context'
  content: string
  lineNum?: number
}

export function DiffViewer({ repoPath, changes, onRefresh, getDiff, isLoading }: DiffViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [compareMode, setCompareMode] = useState<CompareMode>('working-vs-staged')
  const [leftRef, setLeftRef] = useState('HEAD')
  const [rightRef, setRightRef] = useState('')
  const [diffContent, setDiffContent] = useState('')
  const [isDiffLoading, setIsDiffLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const filteredChanges = useMemo(() => {
    if (!filter) return changes
    return changes.filter(c => c.path.toLowerCase().includes(filter.toLowerCase()))
  }, [changes, filter])

  const getCompareRefs = useCallback((): { left: string; right: string } => {
    switch (compareMode) {
      case 'working-vs-staged':
        return { left: '', right: '--cached' }
      case 'working-vs-head':
        return { left: 'HEAD', right: '' }
      case 'staged-vs-head':
        return { left: 'HEAD', right: '--cached' }
      case 'custom':
        return { left: leftRef, right: rightRef }
      default:
        return { left: '', right: '--cached' }
    }
  }, [compareMode, leftRef, rightRef])

  const loadDiff = useCallback(async (filePath: string) => {
    if (!filePath || !repoPath) return
    setIsDiffLoading(true)
    try {
      const { left, right } = getCompareRefs()
      const diff = await getDiff(filePath, left, right)
      setDiffContent(diff)
    } catch (error) {
      setDiffContent(`Error loading diff: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsDiffLoading(false)
    }
  }, [repoPath, getDiff, getCompareRefs])

  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
    void loadDiff(path)
  }

  const parseDiff = (diff: string): DiffLine[] => {
    const lines: DiffLine[] = []
    let currentLine = 1

    for (const line of diff.split('\n')) {
      if (line.startsWith('@@')) {
        // Hunk header
        lines.push({ type: 'header', content: line })
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
        if (match) {
          currentLine = parseInt(match[3], 10)
        }
      } else if (line.startsWith('+')) {
        lines.push({ type: 'add', content: line.slice(1), lineNum: currentLine++ })
      } else if (line.startsWith('-')) {
        lines.push({ type: 'remove', content: line.slice(1) })
      } else if (line.startsWith(' ')) {
        lines.push({ type: 'context', content: line.slice(1), lineNum: currentLine++ })
      } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
        // File header - skip or show as header
        lines.push({ type: 'header', content: line })
      } else {
        lines.push({ type: 'context', content: line })
      }
    }

    return lines
  }

  const parsedDiff = useMemo(() => parseDiff(diffContent), [diffContent])

  const getLineStyle = (type: DiffLine['type']): React.CSSProperties => {
    switch (type) {
      case 'header':
        return {
          background: '#2c2c2c',
          color: '#ce9178',
          fontWeight: 'bold',
          padding: '2px 8px',
        }
      case 'add':
        return {
          background: 'rgba(78, 201, 176, 0.2)',
          color: '#4ec9b0',
          padding: '1px 8px',
        }
      case 'remove':
        return {
          background: 'rgba(244, 135, 113, 0.2)',
          color: '#f48771',
          padding: '1px 8px',
        }
      case 'context':
        return {
          color: '#d4d4d4',
          padding: '1px 8px',
        }
    }
  }

  return (
    <div className="panel-grid">
      {/* Toolbar */}
      <div className="working-tree-toolbar">
        <span className="toolbar-label">Compare:</span>

        <select
          value={compareMode}
          onChange={(e) => setCompareMode(e.target.value as CompareMode)}
          className="commit-input"
          style={{ width: 'auto' }}
          title="Compare mode"
        >
          <option value="working-vs-staged">Working vs Staged</option>
          <option value="working-vs-head">Working vs HEAD</option>
          <option value="staged-vs-head">Staged vs HEAD</option>
          <option value="custom">Custom...</option>
        </select>

        {compareMode === 'custom' && (
          <>
            <input
              type="text"
              value={leftRef}
              onChange={(e) => setLeftRef(e.target.value)}
              placeholder="HEAD"
              className="commit-input"
              style={{ width: '120px' }}
            />
            <span className="toolbar-text">vs</span>
            <input
              type="text"
              value={rightRef}
              onChange={(e) => setRightRef(e.target.value)}
              placeholder="HEAD~1"
              className="commit-input"
              style={{ width: '120px' }}
            />
          </>
        )}

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter files..."
          className="commit-input"
          style={{ marginLeft: 'auto', minWidth: '200px' }}
        />

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? '⏳ ...' : '↻ Refresh'}
        </button>
      </div>

      {/* Main content */}
      <div className="diff-split">
        {/* File list */}
        <div className="diff-file-list">
          <div className="diff-panel-header">
            Files ({filteredChanges.length})
          </div>
          <div className="diff-file-items">
            {filteredChanges.length === 0 ? (
              <div className="diff-empty">No changes</div>
            ) : (
              filteredChanges.map((change) => (
                <button
                  key={change.path}
                  onClick={() => handleFileSelect(change.path)}
                  className={selectedFile === change.path ? 'diff-file-item active' : 'diff-file-item'}
                >
                  <div className="diff-file-row">
                    {change.index && change.index !== ' ' && change.index !== '?' && (
                      <span className="diff-badge staged">●</span>
                    )}
                    {change.working_dir && change.working_dir !== ' ' && (
                      <span className="diff-badge unstaged">●</span>
                    )}
                    <span className="diff-file-path">{change.path}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Diff view */}
        <div className="diff-view">
          <div className="diff-panel-header">
            {selectedFile || 'Diff'}
          </div>

          <div className="diff-content">
            {!selectedFile ? (
              <div className="diff-empty">Select a file to view diff</div>
            ) : isDiffLoading ? (
              <div className="diff-empty">Loading diff...</div>
            ) : !diffContent ? (
              <div className="diff-empty">No diff available</div>
            ) : (
              <div>
                {parsedDiff.map((line, index) => (
                  <div key={index} className={`diff-line diff-line-${line.type}`}>
                    {line.type === 'add' && <span className="diff-marker add">+</span>}
                    {line.type === 'remove' && <span className="diff-marker remove">-</span>}
                    {line.type === 'context' && <span className="diff-marker context"> </span>}
                    {line.lineNum !== undefined && (
                      <span className="diff-linenum">{line.lineNum}</span>
                    )}
                    <span>{line.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
