import { Link } from 'react-router-dom'
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
        { type: 'NEW', text: 'Initial Dev-X-Flow-Pro Release' },
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
          <p>Track the evolution of Dev-X-Flow-Pro</p>
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
        <p>&copy; 2026 Dev-X-Flow-Pro. All rights reserved.</p>
      </footer>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .changelog-page {
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
        }
        
        /* Main Content */
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 120px 20px 60px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 60px;
        }
        
        .header h1 {
          font-size: 36px;
          margin-bottom: 15px;
          color: var(--accent);
        }
        
        .header p {
          color: var(--text-secondary);
          font-size: 16px;
        }
        
        /* Version Cards */
        .version-card {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          border: 1px solid rgba(0, 212, 255, 0.1);
          transition: all 0.3s;
        }
        
        .version-card:hover {
          border-color: var(--accent);
          box-shadow: 0 10px 30px rgba(0, 212, 255, 0.1);
        }
        
        .version-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .version-number {
          background: var(--accent);
          color: var(--bg-primary);
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 18px;
        }
        
        .version-date {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .version-badge {
          margin-left: auto;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .badge-latest {
          background: var(--success);
          color: var(--bg-primary);
        }
        
        .badge-beta {
          background: var(--warning);
          color: var(--bg-primary);
        }
        
        .changes-list {
          list-style: none;
        }
        
        .changes-list li {
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        
        .changes-list li:last-child {
          border-bottom: none;
        }
        
        .change-type {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          min-width: 60px;
          text-align: center;
        }
        
        .type-feature {
          background: rgba(0, 212, 255, 0.2);
          color: var(--accent);
        }
        
        .type-fix {
          background: rgba(0, 255, 136, 0.2);
          color: var(--success);
        }
        
        .type-improvement {
          background: rgba(255, 170, 0, 0.2);
          color: var(--warning);
        }
        
        .change-text {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.6;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          padding: 40px;
          border-top: 1px solid rgba(0, 212, 255, 0.1);
          margin-top: 40px;
        }
        
        .footer p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .container { padding-top: 100px; }
          .version-header { flex-wrap: wrap; }
          .version-badge { margin-left: 0; margin-top: 10px; }
        }
      `}</style>
    </div>
  )
}
