import { useEffect, useRef, useState } from 'react'

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

interface DebugMonitorProps {
  repoPath: string
}

export function DebugMonitor({ repoPath }: DebugMonitorProps) {
  const [logResult, setLogResult] = useState<LogResult | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initial load
  useEffect(() => {
    if (!repoPath) return
    loadLog()
    return () => {
      // Cleanup watcher on unmount
      if (isWatching) {
        void window.devxflow.debugWatchStop(repoPath)
        unsubscribeRef.current?.()
      }
    }
  }, [repoPath])

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logContainerRef.current && autoRefresh) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logResult, autoRefresh])

  const loadLog = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.devxflow.debugReadLog(repoPath)
      setLogResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }

  const startWatching = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Set up listener for updates
      const unsubscribe = window.devxflow.onDebugUpdate((result) => {
        setLogResult(result)
      })
      unsubscribeRef.current = unsubscribe

      // Start watching
      const { success, filePath } = await window.devxflow.debugWatchStart(repoPath)
      if (success) {
        setIsWatching(true)
        // Get initial reading
        const result = await window.devxflow.debugReadLog(repoPath)
        setLogResult(result)
      } else {
        setError(filePath === null ? 'No Laravel log file found' : 'Failed to start watching')
        unsubscribe()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }

  const stopWatching = async () => {
    try {
      await window.devxflow.debugWatchStop(repoPath)
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
      setIsWatching(false)
    } catch (e) {
      console.error('Error stopping watch:', e)
    }
  }

  const handleToggleWatch = () => {
    if (isWatching) {
      void stopWatching()
    } else {
      void startWatching()
    }
  }

  const handleOpenLog = () => {
    if (logResult?.filePath) {
      void window.devxflow.debugOpenLog(logResult.filePath)
    }
  }

  const handleClear = () => {
    setLogResult(null)
  }

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return '#f48771' // Red
      case 'warning':
        return '#ce9178' // Orange
      case 'info':
        return '#007acc' // Blue
      case 'debug':
        return '#4ec9b0' // Teal
      case 'timestamp':
        return '#888888' // Gray
      default:
        return '#d4d4d4' // Light gray
    }
  }

  const getLevelBg = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return 'rgba(244, 135, 113, 0.1)'
      case 'warning':
        return 'rgba(206, 145, 120, 0.1)'
      case 'info':
        return 'rgba(0, 122, 204, 0.1)'
      case 'debug':
        return 'rgba(78, 201, 176, 0.1)'
      default:
        return 'transparent'
    }
  }

  return (
    <div className="panel-grid">
      {/* Controls */}
      <div className="panel-toolbar">
        {/* File info */}
        <div className="toolbar-info">
          <span className="toolbar-icon">
            {logResult?.filePath ? '📄' : '⚠️'}
          </span>
          <span className={logResult?.filePath ? 'text-success' : 'text-warning'}>
            {logResult?.filePath
              ? logResult.filePath.split(/[\\/]/).pop()
              : 'No Laravel log file detected'}
          </span>
        </div>

        {/* Auto-refresh toggle */}
        <label className="toolbar-label">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            disabled={!isWatching}
          />
          Auto-refresh
        </label>

        {/* Buttons */}
        <div className="toolbar-actions">
          <button
            onClick={handleToggleWatch}
            disabled={isLoading}
            className={isWatching ? 'btn btn-warning' : 'btn btn-success'}
          >
            {isWatching ? '⏹ Stop Watch' : isLoading ? '⏳ Loading...' : '👁 Start Watch'}
          </button>

          <button
            onClick={loadLog}
            disabled={isLoading}
            className="btn btn-primary"
          >
            ↻ Refresh
          </button>

          <button
            onClick={handleOpenLog}
            disabled={!logResult?.filePath}
            className="btn btn-secondary"
          >
            📂 Open Log
          </button>

          <button
            onClick={handleClear}
            className="btn btn-secondary"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Error Summary */}
      {logResult && (
        <div className="panel-summary">
          <span className="summary-label">Summary:</span>
          <span className="summary-errors">
            Errors: {logResult.summary.errors}
          </span>
          <span className="summary-warnings">
            Warnings: {logResult.summary.warnings}
          </span>
          <span className="summary-info">
            Info: {logResult.summary.info}
          </span>
          <span className="summary-debug">
            Debug: {logResult.summary.debug}
          </span>
          <span className="summary-total">| Total: {logResult.summary.total} lines</span>
          {logResult.truncated && (
            <span className="summary-truncated">
              (showing last 500 lines)
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="panel-error-message">
          ❌ {error}
        </div>
      )}

      {/* Log Display */}
      <div
        ref={logContainerRef}
        className="log-display"
      >
        {!logResult || logResult.lines.length === 0 ? (
          <div className="log-empty">
            {isLoading
              ? 'Loading logs...'
              : 'No log file detected.\n\nExpected location: storage/logs/laravel.log'}
          </div>
        ) : (
          <div>
            {logResult.lines.map((line, index) => (
              <div
                key={index}
                className={`log-line log-line-${line.level}`}
              >
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
