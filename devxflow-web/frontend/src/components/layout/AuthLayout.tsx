import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-start justify-center px-4 py-20 overflow-y-auto">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
