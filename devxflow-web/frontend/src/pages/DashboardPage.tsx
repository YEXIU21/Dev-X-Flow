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
    { id: 1, action: 'Commit pushed', project: 'devxflow-app', time: '5 min ago', type: 'success' },
    { id: 2, action: 'Branch merged', project: 'mobile-app', time: '1 hour ago', type: 'info' },
    { id: 3, action: 'Issue resolved', project: 'api-server', time: '3 hours ago', type: 'success' },
    { id: 4, action: 'Pull request created', project: 'documentation', time: '5 hours ago', type: 'warning' }
  ]

  const projects = [
    { id: 1, name: 'devxflow-app', status: 'active', lastCommit: '10 min ago', branches: 5 },
    { id: 2, name: 'mobile-app', status: 'active', lastCommit: '2 hours ago', branches: 3 },
    { id: 3, name: 'api-server', status: 'active', lastCommit: '1 day ago', branches: 8 },
    { id: 4, name: 'documentation', status: 'inactive', lastCommit: '3 days ago', branches: 2 }
  ]

  return (
    <div className="dashboard-page">
      <nav className="nav">
        <div className="logo">Dev-X-Flow</div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/download">Download</Link>
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
    </div>
  )
}
