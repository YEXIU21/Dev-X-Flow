import { useState, useEffect } from 'react'

interface Stats {
  totalLicenses: number
  activeLicenses: number
  revokedLicenses: number
  expiredLicenses: number
  totalActivations: number
  recentValidations: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-[#94a3b8]">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
          <p className="text-[#94a3b8] text-sm">Total Licenses</p>
          <p className="text-3xl font-bold text-white mt-2">{stats?.totalLicenses || 0}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
          <p className="text-[#94a3b8] text-sm">Active Licenses</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{stats?.activeLicenses || 0}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
          <p className="text-[#94a3b8] text-sm">Total Activations</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">{stats?.totalActivations || 0}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
          <p className="text-[#94a3b8] text-sm">Revoked Licenses</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{stats?.revokedLicenses || 0}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
          <p className="text-[#94a3b8] text-sm">Expired Licenses</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{stats?.expiredLicenses || 0}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
          <p className="text-[#94a3b8] text-sm">Recent Validations (24h)</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">{stats?.recentValidations || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/licenses" className="px-4 py-2 bg-[#3b82f6] text-white rounded hover:bg-[#2563eb]">
            Manage Licenses
          </a>
          <a href="/admin/payments" className="px-4 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30">
            Review Payments
          </a>
          <a href="/admin/messages" className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
            View Messages
          </a>
          <a href="/admin/settings" className="px-4 py-2 bg-[#334155] text-white rounded hover:bg-[#475569]">
            AI Settings
          </a>
        </div>
      </div>
    </div>
  )
}
