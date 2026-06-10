// src/components/Layout.jsx
import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { getInvoices, getProducts } from '../lib/supabase'
import {
  LayoutDashboard, Package, Users, FileText,
  BarChart3, Smartphone, LogOut, Bell, Menu, X,
  AlertTriangle, IndianRupee, CheckCircle, Languages, Crown
} from 'lucide-react'
import { format } from 'date-fns'

const NAV_KEYS = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'home' },
  { to: '/products', icon: Package, key: 'products' },
  { to: '/invoices', icon: FileText, key: 'invoices' },
  { to: '/customers', icon: Users, key: 'customers' },
  { to: '/simulator', icon: Smartphone, key: 'demo', highlight: true },
]

export default function Layout({ children }) {
  const { business } = useAuth()
  const { lang, switchLang, t } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!business) return
    loadNotifications()
  }, [business])

  const loadNotifications = async () => {
    const [invRes, prodRes] = await Promise.all([
      getInvoices(business.id),
      getProducts(business.id),
    ])
    const invoices = invRes.data || []
    const products = prodRes.data || []

    const notifs = []

    // Pending payment notifications
    const pending = invoices.filter(i => i.status === 'pending')
    if (pending.length > 0) {
      const total = pending.reduce((s, i) => s + (i.total_amount || 0), 0)
      notifs.push({
        id: 'pending',
        type: 'payment',
        icon: IndianRupee,
        color: 'text-orange-500',
        bg: 'bg-orange-50',
        title: t('pendingPaymentsAlert'),
        body: `${pending.length} invoices worth \u20B9${total.toLocaleString('en-IN')} are unpaid`,
        time: 'Now',
        action: '/invoices',
      })
    }

    // Low stock notifications
    const lowStock = products.filter(p => p.stock <= (p.low_stock_threshold || 5))
    lowStock.forEach(p => {
      notifs.push({
        id: `stock-${p.id}`,
        type: 'stock',
        icon: AlertTriangle,
        color: 'text-red-500',
        bg: 'bg-red-50',
        title: t('lowStockAlertTitle'),
        body: `${p.name} has only ${p.stock} units left`,
        time: 'Today',
        action: '/products',
      })
    })

    // Recent paid invoices
    const today = new Date().toISOString().split('T')[0]
    const todayPaid = invoices.filter(i => i.status === 'paid' && i.created_at?.startsWith(today))
    if (todayPaid.length > 0) {
      const total = todayPaid.reduce((s, i) => s + (i.total_amount || 0), 0)
      notifs.push({
        id: 'paid-today',
        type: 'success',
        icon: CheckCircle,
        color: 'text-green-500',
        bg: 'bg-green-50',
        title: t('paymentsReceivedToday'),
        body: `${todayPaid.length} payments totaling \u20B9${total.toLocaleString('en-IN')}`,
        time: 'Today',
        action: '/invoices',
      })
    }

    if (notifs.length === 0) {
      notifs.push({
        id: 'all-good',
        type: 'success',
        icon: CheckCircle,
        color: 'text-green-500',
        bg: 'bg-green-50',
        title: t('allGood'),
        body: t('allGoodSub'),
        time: 'Now',
        action: '/dashboard',
      })
    }

    setNotifications(notifs)
    setUnreadCount(notifs.filter(n => n.type !== 'success').length)
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"
      style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* Header */}
      <header className="bg-navy text-white px-4 pt-8 pb-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-blue-300">Welcome back</p>
            <h1 className="font-display font-bold text-base leading-tight truncate max-w-[200px]">
              {business?.name || 'My Business'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={() => { setShowNotifications(true); setUnreadCount(0) }}
              className="relative p-2 bg-white/10 rounded-xl active:bg-white/20"
            >
              <Bell size={18} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => switchLang(lang === 'en' ? 'te' : 'en')}
              className="p-2 bg-white/10 rounded-xl active:bg-white/20 flex items-center gap-1"
              title={lang === 'en' ? 'Switch to Telugu' : 'English కి మార్చండి'}
            >
              <span className="text-white text-xs font-bold">{lang === 'en' ? 'తె' : 'EN'}</span>
            </button>
            <button onClick={() => setShowMore(!showMore)} className="p-2 bg-white/10 rounded-xl active:bg-white/20">
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

      {/* More Dropdown */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowMore(false)} />
          <div className="fixed top-20 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 w-44"
            style={{ right: 'max(1rem, calc(50% - 224px))' }}>
            <NavLink to="/pricing" onClick={() => setShowMore(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-amber-600 hover:bg-amber-50">
              <Crown size={18} className="text-amber-500" /> {lang === 'te' ? 'Premium' : 'Premium'}
            </NavLink>
            <NavLink to="/reports" onClick={() => setShowMore(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              <BarChart3 size={18} className="text-primary" /> {t('reports')}
            </NavLink>
            <NavLink to="/whatsapp-setup" onClick={() => setShowMore(false)}
  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
  <MessageSquare size={18} className="text-green-500" /> WhatsApp Setup
</NavLink>
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full">
              <LogOut size={18} /> {t('logout')}
            </button>
          </div>
        </>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-0 right-0 h-full bg-white z-50 shadow-2xl flex flex-col"
            style={{ width: '100%', maxWidth: 480, left: '50%', transform: 'translateX(-50%)' }}>
            {/* Header */}
            <div className="bg-navy text-white px-4 pt-8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-lg">{t('notifications')}</h2>
                <p className="text-blue-300 text-xs">{notifications.length} {t('alerts')}</p>
              </div>
              <button onClick={() => setShowNotifications(false)}
                className="p-2 bg-white/10 rounded-xl">
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => { setShowNotifications(false); navigate(n.action) }}
                  className="w-full bg-white rounded-2xl p-4 flex items-start gap-3 border border-gray-100 shadow-sm active:bg-gray-50 text-left"
                >
                  <div className={`w-10 h-10 ${n.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <n.icon size={18} className={n.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-gray-300 mt-1">{n.time}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => { loadNotifications(); }}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm"
              >
                {t('refreshNotifications')}
              </button>
            </div>
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
          {NAV_KEYS.map(({ to, icon: Icon, key, highlight }) => {
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
                }`}>{t(key)}</span>
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
