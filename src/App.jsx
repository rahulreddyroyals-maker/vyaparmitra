// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import CustomersPage from './pages/CustomersPage'
import InvoicesPage from './pages/InvoicesPage'
import ReportsPage from './pages/ReportsPage'
import SimulatorPage from './pages/SimulatorPage'

function ProtectedRoutes() {
  const { user, onboarded, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-light flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-navy font-display font-bold text-xl">
          <span className="text-primary">Vyapar</span>
          <span className="text-success">Mitra</span>
        </p>
        <p className="text-gray-400 text-sm mt-1">Loading your business...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/auth" replace />
  if (!onboarded) return <Navigate to="/onboarding" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<InvoicesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function AuthRoutes() {
  const { user, onboarded, loading } = useAuth()
  if (loading) return null
  if (user && !onboarded) return <Navigate to="/onboarding" replace />
  if (user && onboarded) return <Navigate to="/dashboard" replace />
  return <AuthPage />
}

function OnboardingRoute() {
  const { user, onboarded, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />
  if (onboarded) return <Navigate to="/dashboard" replace />
  return <OnboardingPage />
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { borderRadius: '12px', fontFamily: "'Noto Sans', sans-serif", fontSize: '14px' },
              success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/auth" element={<AuthRoutes />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
