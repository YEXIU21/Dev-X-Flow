import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { GitBranch, FolderGit2, Rocket, RefreshCw, Plus, Sparkles, Bug, Clock, Activity as ActivityIcon, Settings, ExternalLink } from 'lucide-react'

const API_BASE = 'http://localhost:5000/api'

export function DashboardPage() {
  const { customer, token } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCommits: 0,
    repositories: 0,
    activeProjects: 0,
    lastSync: 'Never'
  })

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: number
    action: string
    project: string
    time: string
    type: 'success' | 'info' | 'warning' | 'error'
  }>>([])

  const [projects, setProjects] = useState<Array<{
    id: number
    name: string
    status: string
    lastCommit: string
    branches: number
  }>>([])

  useEffect(() => {
    loadDashboardData()
  }, [token])

  const loadDashboardData = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      // Load real data from backend
      const res = await fetch(`${API_BASE}/customers/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.stats || stats)
        setRecentActivity(data.activity || [])
        setProjects(data.projects || [])
      }
    } catch (e) {
      // Use placeholder data if API not available
      setStats({
        totalCommits: 0,
        repositories: 0,
        activeProjects: 0,
        lastSync: 'Connect desktop app'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Navbar />

      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Welcome back, {customer?.name?.split(' ')[0] || 'User'}</h1>
            <p>Here's what's happening with your development workflow.</p>
          </div>
          <Link to="/download" className="btn-primary btn-download">
            <ExternalLink size={18} />
            Open Desktop App
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon commits">
              <GitBranch size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalCommits.toLocaleString()}</span>
              <span className="stat-label">Total Commits</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon repos">
              <FolderGit2 size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.repositories}</span>
              <span className="stat-label">Repositories</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon projects">
              <Rocket size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.activeProjects}</span>
              <span className="stat-label">Active Projects</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon sync">
              <RefreshCw size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.lastSync}</span>
              <span className="stat-label">Last Sync</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <ActivityIcon size={18} /> Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <FolderGit2 size={18} /> Projects
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Clock size={18} /> Activity
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-content">
              {/* Quick Actions */}
              <section className="content-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions-grid">
                  <button className="action-card">
                    <div className="action-icon"><Plus size={20} /></div>
                    <div className="action-text">
                      <span className="action-title">New Repository</span>
                      <span className="action-desc">Clone or create a repo</span>
                    </div>
                  </button>
                  <button className="action-card">
                    <div className="action-icon"><RefreshCw size={20} /></div>
                    <div className="action-text">
                      <span className="action-title">Sync All</span>
                      <span className="action-desc">Pull latest changes</span>
                    </div>
                  </button>
                  <button className="action-card">
                    <div className="action-icon"><Sparkles size={20} /></div>
                    <div className="action-text">
                      <span className="action-title">AI Commit</span>
                      <span className="action-desc">Generate commit message</span>
                    </div>
                  </button>
                  <button className="action-card">
                    <div className="action-icon"><Bug size={20} /></div>
                    <div className="action-text">
                      <span className="action-title">Debug Mode</span>
                      <span className="action-desc">Monitor application logs</span>
                    </div>
                  </button>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="content-section">
                <h2>Recent Activity</h2>
                {isLoading ? (
                  <div className="loading-state">Loading activity...</div>
                ) : recentActivity.length === 0 ? (
                  <div className="empty-state">
                    <ActivityIcon size={48} />
                    <p>No recent activity</p>
                    <span>Connect the desktop app to start tracking</span>
                  </div>
                ) : (
                  <div className="activity-list">
                    {recentActivity.map(activity => (
                      <div key={activity.id} className="activity-item">
                        <div className={`activity-indicator ${activity.type}`}></div>
                        <div className="activity-content">
                          <span className="activity-action">{activity.action}</span>
                          <span className="activity-project">{activity.project}</span>
                        </div>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="projects-content">
              <div className="section-header">
                <h2>Your Projects</h2>
                <button className="btn-primary">New Project</button>
              </div>
              
              {isLoading ? (
                <div className="loading-state">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="empty-state">
                  <FolderGit2 size={48} />
                  <p>No projects yet</p>
                  <span>Open the desktop app to add repositories</span>
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.map(project => (
                    <div key={project.id} className="project-card">
                      <div className="project-header">
                        <h3>{project.name}</h3>
                        <span className={`status-badge ${project.status}`}>{project.status}</span>
                      </div>
                      <div className="project-meta">
                        <span><Clock size={14} /> {project.lastCommit}</span>
                        <span><GitBranch size={14} /> {project.branches} branches</span>
                      </div>
                      <div className="project-actions">
                        <button className="btn-ghost">Open</button>
                        <button className="btn-ghost">Sync</button>
                        <Link to="/settings" className="btn-ghost">
                          <Settings size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="activity-content">
              <h2>Full Activity Log</h2>
              {isLoading ? (
                <div className="loading-state">Loading activity log...</div>
              ) : recentActivity.length === 0 ? (
                <div className="empty-state">
                  <Clock size={48} />
                  <p>No activity recorded</p>
                  <span>Activity will appear here when you use the desktop app</span>
                </div>
              ) : (
                <div className="activity-log">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="log-item">
                      <span className="log-time">{activity.time}</span>
                      <span className={`log-type ${activity.type}`}>{activity.action}</span>
                      <span className="log-project">{activity.project}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
