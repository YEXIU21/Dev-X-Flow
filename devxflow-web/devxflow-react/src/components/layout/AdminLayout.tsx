import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Key, CreditCard, MessageSquare, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils/cn'

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Licenses', href: '/admin/licenses', icon: Key },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1e293b] rounded-lg border border-[#334155]"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#1e293b] border-r border-[#334155] transform transition-transform duration-200 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[#334155]">
            <Link to="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-white">Admin Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                      : 'text-[#94a3b8] hover:bg-[#334155] hover:text-white'
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[#334155]">
            <button className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
