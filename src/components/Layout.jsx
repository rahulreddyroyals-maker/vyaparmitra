// src/components/Layout.jsx
import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Package, Users, FileText,
  BarChart3, Smartphone, LogOut, Bell, Menu
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/simulator', icon: Smartphone, label: 'Demo', highlight: true },
]

export default function Layout({ children }) {
  const { business } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      {/* Top Header */}
      <header className="bg-navy text-white px-4 pt-8 pb-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-blue-300">Welcome back</p>
            <h1 className="font-display font-bold text-base leading-tight truncate max-w-[220px]">
              {business?.name || 'My Business'} 
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 bg-white/10 rounded-xl">
              <Bell size={18} className="text-white" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-alert rounded-full" />
            </button>
            <button onClick={() => setShowMore(!showMore)} className="p-2 bg-white/10 rounded-xl">
              <Menu size={18} className="text-white" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center">
            <span className="text-primary font-bold text-xs">V</span>
          </div>
          <span className="text-xs font-display font-bold">
            <span className="text-white">Vyapar</span><span className="text-success">Mitra</span>
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-green-300">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </header>

      {/* Dropdown More Menu */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowMore(false)} />
          <div className="fixed top-20 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 w-44" style={{ maxWidth: 'calc(480px - 2rem)', right: 'max(1rem, calc(50% - 224px))' }}>
            <NavLink to="/reports" onClick={() => setShowMore(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              <BarChart3 size={18} className="text-primary" /> Reports
            </NavLink>
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 80 }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 bg-white border-t border-gray-200 z-50"
        style={{ width: '100%', maxWidth: 480, left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-center justify-around px-1 py-2">
          {NAV.map(({ to, icon: Icon, label, highlight }) => {
            const active = location.pathname === to
            return (
              <NavLink key={to} to={to}
                className="flex flex-col items-center gap-0.5 flex-1 py-1 relative">
                <div className={`p-2 rounded-xl transition-all ${
                  active ? 'bg-primary text-white shadow-md shadow-primary/40'
                  : highlight ? 'bg-green-100 text-green-700'
                  : 'text-gray-400'
                }`}>
                  <Icon size={19} />
                </div>
                <span className={`text-xs font-medium ${
                  active ? 'text-primary' : highlight ? 'text-green-600' : 'text-gray-400'
                }`}>{label}</span>
                {highlight && !active && (
                  <span className="absolute top-0 right-2 w-2 h-2 bg-success rounded-full" />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
