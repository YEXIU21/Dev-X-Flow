import { Outlet } from 'react-router-dom'
import { Navbar } from '../common/Navbar'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
