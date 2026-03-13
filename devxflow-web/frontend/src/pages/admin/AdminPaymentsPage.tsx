import { useState, useEffect } from 'react'

interface Payment {
  _id: string
  customer_email: string
  customer_name: string
  amount: number
  plan: string
  status: string
  gcash_reference: string
  proof_image_url: string
  created_at: string
  license_key: string
}

const PLAN_NAMES: Record<string, string> = {
  pro: 'Pro (₱1,499/yr)',
  pro_plus: 'Pro+ (₱2,499/yr)',
  teams: 'Teams (₱4,999/yr)',
  enterprise: 'Enterprise (Custom)'
}

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    fetchPayments()
  }, [filter])

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`http://localhost:5000/api/payment/admin/all?status=${filter}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments)
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (paymentId: string) => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`http://localhost:5000/api/payment/admin/verify/${paymentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        alert(`Payment verified! License key: ${data.license_key}`)
        fetchPayments()
      }
    } catch (err) {
      console.error('Failed to verify payment:', err)
    }
  }

  const handleReject = async (paymentId: string) => {
    if (!confirm('Are you sure you want to reject this payment?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await fetch(`http://localhost:5000/api/payment/admin/reject/${paymentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchPayments()
    } catch (err) {
      console.error('Failed to reject payment:', err)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Payment Management</h1>
      
      <div className="flex gap-2 mb-6">
        {['pending', 'verified', 'rejected', ''].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg ${
              filter === status ? 'bg-[#3b82f6] text-white' : 'bg-[#1e293b] text-[#94a3b8]'
            }`}
          >
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#94a3b8]">Loading payments...</p>
      ) : payments.length === 0 ? (
        <p className="text-[#94a3b8]">No payments found.</p>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment._id} className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-semibold">{payment.customer_name}</p>
                  <p className="text-[#94a3b8] text-sm">{payment.customer_email}</p>
                  <p className="text-white mt-2">₱{payment.amount} - <span className="text-cyan-400">{PLAN_NAMES[payment.plan] || payment.plan}</span></p>
                  <p className="text-[#94a3b8] text-sm">GCash Ref: {payment.gcash_reference}</p>
                  {payment.license_key && (
                    <p className="text-green-400 text-sm mt-2">License: {payment.license_key}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    payment.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                    payment.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {payment.status}
                  </span>
                  <p className="text-[#94a3b8] text-sm mt-2">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                  {payment.proof_image_url && (
                    <a 
                      href={payment.proof_image_url} 
                      target="_blank" 
                      className="text-[#3b82f6] text-sm hover:underline block mt-2"
                    >
                      View Proof
                    </a>
                  )}
                </div>
              </div>
              {payment.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleVerify(payment._id)}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                  >
                    Verify & Generate License
                  </button>
                  <button
                    onClick={() => handleReject(payment._id)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
