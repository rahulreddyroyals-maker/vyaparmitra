// src/components/Layout.jsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Package, Users, FileText, BarChart3,
  Menu, X, LogOut, Bell, MessageSquare, Smartphone
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/simulator', icon: Smartphone, label: 'WA Simulator', highlight: true },
]

export default function Layout({ children }) {
  const { user, business } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-light flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h1 className="text-xl font-display font-bold">
              <span className="text-white">Vyapar</span>
              <span className="text-success">Mitra</span>
            </h1>
            <p className="text-xs text-blue-300 mt-0.5 truncate">{business?.name || 'My Business'}</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : highlight
                    ? 'text-green-300 hover:bg-white/10 hover:text-white border border-green-700/40'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {highlight && <span className="text-xs bg-success text-white px-1.5 py-0.5 rounded-full">Demo</span>}
            </NavLink>
          ))}
        </nav>

        {/* WhatsApp CTA */}
        <div className="mx-4 mt-4 p-4 bg-green-900/40 rounded-xl border border-green-700/40">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-green-400" />
            <span className="text-xs font-bold text-green-400">WhatsApp Active</span>
          </div>
          <p className="text-xs text-green-300">Send messages to manage your business</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setOpen(true)} className="lg:hidden text-gray-600 hover:text-navy">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs text-gray-400">Welcome back,</p>
              <p className="font-display font-bold text-navy text-lg">
                {user?.profile?.name || business?.name || 'Business Owner'} 👋
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-navy transition-all">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-alert rounded-full"></span>
            </button>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-sm">
                {(business?.name || 'V')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
