import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalCommits: 0,
    repositories: 0,
    activeProjects: 0,
    lastSync: ''
  })

  useEffect(() => {
    // Simulate loading dashboard data
    setStats({
      totalCommits: 1247,
      repositories: 8,
      activeProjects: 3,
      lastSync: '2 minutes ago'
    })
  }, [])

  const recentActivity = [
    { id: 1, action: 'Commit pushed', project: 'devxflow-pro', time: '5 min ago', type: 'success' },
    { id: 2, action: 'Branch merged', project: 'mobile-app', time: '1 hour ago', type: 'info' },
    { id: 3, action: 'Issue resolved', project: 'api-server', time: '3 hours ago', type: 'success' },
    { id: 4, action: 'Pull request created', project: 'documentation', time: '5 hours ago', type: 'warning' }
  ]

  const projects = [
    { id: 1, name: 'devxflow-pro', status: 'active', lastCommit: '10 min ago', branches: 5 },
    { id: 2, name: 'mobile-app', status: 'active', lastCommit: '2 hours ago', branches: 3 },
    { id: 3, name: 'api-server', status: 'active', lastCommit: '1 day ago', branches: 8 },
    { id: 4, name: 'documentation', status: 'inactive', lastCommit: '3 days ago', branches: 2 }
  ]

  return (
    <div className="dashboard-page">
      <nav className="nav">
        <div className="logo">Dev-X-Flow-Pro</div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/changelog">Changelog</Link>
          <Link to="/logout">Logout</Link>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening with your projects.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{stats.totalCommits}</h3>
              <p>Total Commits</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🗂️</div>
            <div className="stat-info">
              <h3>{stats.repositories}</h3>
              <p>Repositories</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🚀</div>
            <div className="stat-info">
              <h3>{stats.activeProjects}</h3>
              <p>Active Projects</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-info">
              <h3>{stats.lastSync}</h3>
              <p>Last Sync</p>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="content-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions">
                  <button className="action-btn">
                    <span className="action-icon">➕</span>
                    <span>New Repository</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">🔄</span>
                    <span>Sync All</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">📝</span>
                    <span>AI Commit</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">🐛</span>
                    <span>Debug Mode</span>
                  </button>
                </div>
              </div>

              <div className="content-section">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className={`activity-indicator ${activity.type}`}></div>
                      <div className="activity-content">
                        <p className="activity-action">{activity.action}</p>
                        <p className="activity-project">{activity.project}</p>
                      </div>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="projects-content">
              <div className="content-header">
                <h2>Your Projects</h2>
                <button className="btn-primary">New Project</button>
              </div>
              
              <div className="projects-grid">
                {projects.map(project => (
                  <div key={project.id} className="project-card">
                    <div className="project-header">
                      <h3>{project.name}</h3>
                      <span className={`status ${project.status}`}>{project.status}</span>
                    </div>
                    <div className="project-info">
                      <p>Last commit: {project.lastCommit}</p>
                      <p>Branches: {project.branches}</p>
                    </div>
                    <div className="project-actions">
                      <button className="btn-small">Open</button>
                      <button className="btn-small">Sync</button>
                      <button className="btn-small">Settings</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="activity-content">
              <h2>Full Activity Log</h2>
              <div className="activity-log">
                {recentActivity.concat(recentActivity).map((activity, index) => (
                  <div key={index} className="log-item">
                    <span className="log-time">{activity.time}</span>
                    <span className="log-action">{activity.action}</span>
                    <span className="log-project">{activity.project}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-content">
              <h2>Settings</h2>
              <div className="settings-form">
                <div className="form-group">
                  <label htmlFor="ai-provider">Default AI Provider</label>
                  <select id="ai-provider" aria-label="Default AI Provider">
                    <option>OpenAI GPT-4</option>
                    <option>Claude 3.5</option>
                    <option>Gemini Pro</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="sync-frequency">Sync Frequency</label>
                  <select id="sync-frequency" aria-label="Sync Frequency">
                    <option>Every 5 minutes</option>
                    <option>Every 15 minutes</option>
                    <option>Every hour</option>
                    <option>Manual only</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="theme">Theme</label>
                  <select id="theme" aria-label="Theme">
                    <option>Dark</option>
                    <option>Light</option>
                    <option>Auto</option>
                  </select>
                </div>
                
                <button className="btn-primary">Save Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard-page {
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
        }
        
        .nav {
          position: fixed;
          top: 0;
          width: 100%;
          padding: 15px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1000;
          background: rgba(10, 10, 15, 0.9);
          border-bottom: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .logo {
          font-size: 20px;
          font-weight: 700;
          color: var(--accent);
        }
        
        .nav-links {
          display: flex;
          gap: 30px;
        }
        
        .nav-links a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s;
        }
        
        .nav-links a:hover {
          color: var(--accent);
        }
        
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 30px 50px;
        }
        
        .dashboard-header {
          margin-bottom: 40px;
        }
        
        .dashboard-header h1 {
          font-size: 36px;
          margin-bottom: 10px;
          color: var(--accent);
        }
        
        .dashboard-header p {
          color: var(--text-secondary);
          font-size: 16px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 25px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: var(--bg-card);
          padding: 25px;
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s;
        }
        
        .stat-card:hover {
          border-color: rgba(0, 212, 255, 0.3);
          transform: translateY(-2px);
        }
        
        .stat-icon {
          font-size: 32px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 10px;
        }
        
        .stat-info h3 {
          font-size: 28px;
          margin-bottom: 5px;
          color: var(--text-primary);
        }
        
        .stat-info p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .tab {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 15px 25px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s;
          border-bottom: 2px solid transparent;
        }
        
        .tab:hover {
          color: var(--text-primary);
        }
        
        .tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }
        
        .tab-content {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 30px;
          border: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .content-section {
          margin-bottom: 40px;
        }
        
        .content-section h2 {
          font-size: 24px;
          margin-bottom: 20px;
          color: var(--accent);
        }
        
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        
        .action-btn {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 10px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
        }
        
        .action-btn:hover {
          background: rgba(0, 212, 255, 0.2);
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        
        .action-icon {
          font-size: 24px;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: var(--bg-card);
          border-radius: 8px;
        }
        
        .activity-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .activity-indicator.success {
          background: var(--success);
        }
        
        .activity-indicator.info {
          background: var(--accent);
        }
        
        .activity-indicator.warning {
          background: var(--warning);
        }
        
        .activity-content {
          flex: 1;
        }
        
        .activity-action {
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        
        .activity-project {
          color: var(--text-secondary);
          font-size: 12px;
        }
        
        .activity-time {
          color: var(--text-secondary);
          font-size: 12px;
        }
        
        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        
        .btn-primary {
          background: var(--accent);
          color: var(--bg-primary);
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 600;
          transition: all 0.3s;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
        }
        
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }
        
        .project-card {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 25px;
          border: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .project-header h3 {
          color: var(--text-primary);
        }
        
        .status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status.active {
          background: rgba(0, 255, 136, 0.2);
          color: var(--success);
        }
        
        .status.inactive {
          background: rgba(139, 139, 154, 0.2);
          color: var(--text-secondary);
        }
        
        .project-info {
          margin-bottom: 20px;
        }
        
        .project-info p {
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .project-actions {
          display: flex;
          gap: 10px;
        }
        
        .btn-small {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.2);
          color: var(--accent);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          transition: all 0.3s;
        }
        
        .btn-small:hover {
          background: rgba(0, 212, 255, 0.2);
        }
        
        .activity-log {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .log-item {
          display: grid;
          grid-template-columns: 120px 1fr 150px;
          gap: 20px;
          padding: 15px;
          background: var(--bg-card);
          border-radius: 8px;
          font-size: 14px;
        }
        
        .log-time {
          color: var(--text-secondary);
        }
        
        .log-action {
          color: var(--text-primary);
        }
        
        .log-project {
          color: var(--accent);
        }
        
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 25px;
          max-width: 400px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .form-group select {
          background: var(--bg-card);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 6px;
          padding: 10px;
          color: var(--text-primary);
          font-family: inherit;
        }
        
        .form-group select:focus {
          outline: none;
          border-color: var(--accent);
        }
        
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 100px 20px 50px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .quick-actions {
            grid-template-columns: 1fr;
          }
          
          .projects-grid {
            grid-template-columns: 1fr;
          }
          
          .log-item {
            grid-template-columns: 1fr;
            gap: 5px;
          }
          
          .nav-links {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
