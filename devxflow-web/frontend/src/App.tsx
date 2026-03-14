import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { MainLayout } from './components/layout/MainLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { LandingPage } from './pages/LandingPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ContactPage } from './pages/ContactPage'
import { PaymentPage } from './pages/PaymentPage'
import { DownloadPage } from './pages/DownloadPage'
import { ComparePage } from './pages/ComparePage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminLicensesPage } from './pages/admin/AdminLicensesPage'
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage'
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminPaymentSettingsPage } from './pages/admin/AdminPaymentSettingsPage'
import { SettingsPage } from './pages/customer/SettingsPage'
import { LicensePage } from './pages/customer/LicensePage'
import { EnterpriseDashboard } from './pages/enterprise/EnterpriseDashboard'

// Placeholder pages - to be implemented
function PricingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold gradient-text">Pricing Page</h1>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
        <p className="text-[#94a3b8] mb-8">Page not found</p>
        <a href="/" className="text-[#3b82f6] hover:underline">Go back home</a>
      </div>
    </div>
  )
}

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/download" element={<DownloadPage />} />
            </Route>

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
            </Route>

            {/* Protected User Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/license" element={<LicensePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/enterprise" element={<EnterpriseDashboard />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/licenses" element={<AdminLicensesPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/messages" element={<AdminMessagesPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/payment-settings" element={<AdminPaymentSettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
