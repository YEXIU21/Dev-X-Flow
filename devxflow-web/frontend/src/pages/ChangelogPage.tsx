import { Navbar } from '../components/common/Navbar'

export function ChangelogPage() {
  const changelog = [
    {
      version: 'v7.1.2',
      date: '2026-02-08',
      badge: 'badge-latest',
      badgeText: 'Latest',
      changes: [
        { type: 'NEW', text: 'Database DDL helpers: run_sql(), create_database(), drop_database()' },
        { type: 'NEW', text: 'SQL/DDL Console - in-app SQL editor' },
        { type: 'NEW', text: 'Create/Drop Database UI with confirmations' },
        { type: 'NEW', text: 'Create Table Wizard for generating CREATE TABLE statements' },
        { type: 'SAFETY', text: 'Added basic identifier validation for DB/table/column names' }
      ]
    },
    {
      version: 'v7.1.1',
      date: '2026-02-08',
      badge: '',
      badgeText: '',
      changes: [
        { type: 'FIXED', text: 'UI Crash: tk.TclError unknown option "-bg" on ttk.Entry' },
        { type: 'FIXED', text: 'Dark mode consistency for dropdowns and checkboxes' }
      ]
    },
    {
      version: 'v7.1',
      date: '2026-02-08',
      badge: '',
      badgeText: '',
      changes: [
        { type: 'NEW', text: 'Multi-Database Support (MySQL, PostgreSQL, SQL Server, SQLite)' },
        { type: 'NEW', text: 'Database Adapter Architecture with unified interface' },
        { type: 'NEW', text: 'MySQL/MariaDB support with CLI auto-detection' },
        { type: 'NEW', text: 'SQLite native support with file picker' },
        { type: 'NEW', text: 'PostgreSQL support with psycopg driver' },
        { type: 'NEW', text: 'SQL Server support with pyodbc driver' }
      ]
    },
    {
      version: 'v7.0',
      date: '2026-02-08',
      badge: '',
      badgeText: '',
      changes: [
        { type: 'NEW', text: 'Initial Dev-X-Flow Release' },
        { type: 'NEW', text: 'Modern dark UI with tabbed interface' },
        { type: 'NEW', text: 'Repository management (commit, push, pull, stash)' },
        { type: 'NEW', text: 'AI-powered commit message generation (7 providers)' },
        { type: 'NEW', text: 'Integrated terminal with project-type detection' },
        { type: 'NEW', text: 'Laravel debug log monitoring' },
        { type: 'NEW', text: 'Git diff viewer and merge conflict resolver' },
        { type: 'NEW', text: 'Interactive rebase support' },
        { type: 'NEW', text: 'MySQL database management integration' }
      ]
    },
    {
      version: 'v6.x',
      date: 'Pre-release',
      badge: '',
      badgeText: '',
      changes: [
        { type: 'FEATURE', text: 'Interactive Rebase Tab for commit history management' },
        { type: 'FEATURE', text: 'Git Diff Viewer with color-coded output' },
        { type: 'FEATURE', text: 'Merge Conflict Resolver with 3-way view' },
        { type: 'FEATURE', text: 'Git Author Configuration Dialog' },
        { type: 'FEATURE', text: '7 AI Provider Support (OpenAI, Gemini, Claude, etc.)' },
        { type: 'FEATURE', text: 'Debug Tools with Laravel log monitoring' },
        { type: 'FEATURE', text: 'Integrated Terminal with command history' },
        { type: 'FEATURE', text: 'Sync to Main Workflow (commit → merge → push → pull)' },
        { type: 'FEATURE', text: 'Modern Dark UI Theme' }
      ]
    }
  ]

  const getChangeTypeClass = (type: string) => {
    switch (type) {
      case 'NEW': return 'type-feature'
      case 'FIXED': return 'type-fix'
      case 'SAFETY': return 'type-improvement'
      case 'FEATURE': return 'type-feature'
      default: return 'type-feature'
    }
  }

  return (
    <div className="changelog-page">
      <Navbar />
      
      <div className="container">
        <div className="header">
          <h1>Changelog</h1>
          <p>Track the evolution of Dev-X-Flow</p>
        </div>
        
        {changelog.map((release, index) => (
          <div key={index} className="version-card">
            <div className="version-header">
              <div className="version-number">{release.version}</div>
              <div className="version-date">{release.date}</div>
              {release.badge && (
                <div className={`version-badge ${release.badge}`}>{release.badgeText}</div>
              )}
            </div>
            <ul className="changes-list">
              {release.changes.map((change, changeIndex) => (
                <li key={changeIndex}>
                  <span className={`change-type ${getChangeTypeClass(change.type)}`}>{change.type}</span>
                  <span className="change-text">{change.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <footer className="footer">
        <h2>Why DevXFlow?</h2>
        <p>&copy; 2026 DevXFlow. All rights reserved.</p>
      </footer>
    </div>
  )
}
