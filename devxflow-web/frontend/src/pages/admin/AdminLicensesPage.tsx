import { useState, useEffect } from 'react'

interface License {
  _id: string
  license_key: string
  customer_email: string
  status: string
  tier: string
  max_activations: number
  created_at: string
  expires_at: string
}

export function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLicenses()
  }, [])

  const fetchLicenses = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:5000/api/admin/search?q=' + searchQuery, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setLicenses(data.licenses)
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLicenses()
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this license?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await fetch(`http://localhost:5000/api/admin/license/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchLicenses()
    } catch (err) {
      console.error('Failed to revoke license:', err)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">License Management</h1>
      
      <form onSubmit={handleSearch} className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by license key or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white"
        />
        <button type="submit" className="px-6 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb]">
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-[#94a3b8]">Loading licenses...</p>
      ) : licenses.length === 0 ? (
        <p className="text-[#94a3b8]">No licenses found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-[#94a3b8]">
              <tr>
                <th className="p-4">License Key</th>
                <th className="p-4">Customer Email</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tier</th>
                <th className="p-4">Max Activations</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr key={license._id} className="border-b border-[#334155] text-white">
                  <td className="p-4 font-mono">{license.license_key}</td>
                  <td className="p-4">{license.customer_email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      license.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      license.status === 'revoked' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {license.status}
                    </span>
                  </td>
                  <td className="p-4">{license.tier}</td>
                  <td className="p-4">{license.max_activations}</td>
                  <td className="p-4">{license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleRevoke(license._id)}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
