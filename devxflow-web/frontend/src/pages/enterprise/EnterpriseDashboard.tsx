import { useState, useEffect } from 'react'
import { Navbar } from '../../components/common/Navbar'
import { useAuth } from '../../contexts/AuthContext'
import { Users, Mail, Trash2, UserPlus, Key, Calendar, CheckCircle, Clock } from 'lucide-react'

const API_BASE = 'http://localhost:5000/api'

interface TeamMember {
  email: string
  status: 'pending' | 'active'
  added_at: string
  activated_at?: string
}

interface EnterpriseLicense {
  license_key: string
  seats: number
  seats_used: number
  status: string
  expires_at: string | null
  team_members: TeamMember[]
}

export function EnterpriseDashboard() {
  const { customer, token } = useAuth()
  const [license, setLicense] = useState<EnterpriseLicense | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (customer?.enterprise_role !== 'admin') {
      window.location.href = '/dashboard'
      return
    }
    loadEnterpriseData()
  }, [token])

  const loadEnterpriseData = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/enterprise/license`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setLicense(data.license)
      }
    } catch (e) {
      console.error('Failed to load enterprise data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    if (!newMemberEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (license && license.seats_used >= license.seats) {
      setError('No seats available. Please upgrade your license.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE}/enterprise/team/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newMemberEmail.trim().toLowerCase() })
      })

      const data = await res.json()
      if (data.success) {
        setLicense(data.license)
        setShowAddModal(false)
        setNewMemberEmail('')
        setSuccess(`Invitation sent to ${newMemberEmail}`)
      } else {
        setError(data.error || 'Failed to add team member')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (email: string) => {
    if (!confirm(`Remove ${email} from your team?`)) return

    try {
      const res = await fetch(`${API_BASE}/enterprise/team/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      })

      const data = await res.json()
      if (data.success) {
        setLicense(data.license)
        setSuccess(`${email} removed from team`)
      } else {
        setError(data.error || 'Failed to remove team member')
      }
    } catch (e) {
      setError('Connection failed')
    }
  }

  if (isLoading && !license) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <div className="pt-24 px-6">
          <p className="text-[#94a3b8]">Loading enterprise dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      
      <div className="pt-24 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Enterprise Dashboard</h1>
          <p className="text-[#94a3b8]">Manage your team and license</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* License Info */}
        {license && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-[#00d4ff]" />
                <span className="text-[#94a3b8] text-sm">License Key</span>
              </div>
              <p className="text-white font-mono text-lg">{license.license_key}</p>
            </div>

            <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-[#00d4ff]" />
                <span className="text-[#94a3b8] text-sm">Seats Used</span>
              </div>
              <p className="text-white text-2xl font-bold">
                {license.seats_used} / {license.seats}
              </p>
            </div>

            <div className="bg-[#1e293b] p-6 rounded-lg border border-[#334155]">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-[#00d4ff]" />
                <span className="text-[#94a3b8] text-sm">Expires</span>
              </div>
              <p className="text-white text-lg">
                {license.expires_at 
                  ? new Date(license.expires_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-[#1e293b] rounded-lg border border-[#334155] overflow-hidden">
          <div className="p-6 border-b border-[#334155] flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Team Members</h2>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={license ? license.seats_used >= license.seats : false}
              className="flex items-center gap-2 px-4 py-2 bg-[#00d4ff] text-black rounded-lg hover:bg-[#00b4e0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f172a]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {license?.team_members.map((member, idx) => (
                  <tr key={idx} className="hover:bg-[#0f172a]/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#94a3b8]" />
                        <span className="text-white">{member.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        member.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {member.status === 'active' ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            Pending
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#94a3b8]">
                      {new Date(member.added_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.email)}
                        title={`Remove ${member.email}`}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!license || license.team_members.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#94a3b8]">
                      No team members yet. Add members to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-lg border border-[#334155] p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Add Team Member</h3>
            
            <div className="mb-4">
              <label className="block text-[#94a3b8] text-sm mb-2">Email Address</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00d4ff]"
              />
            </div>

            <p className="text-[#94a3b8] text-sm mb-6">
              An invitation will be sent to this email. The team member will need to create an account to activate their seat.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-[#334155] text-white rounded-lg hover:bg-[#475569]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-[#00d4ff] text-black rounded-lg hover:bg-[#00b4e0] disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
