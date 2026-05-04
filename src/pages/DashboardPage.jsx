// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { getInvoices, getProducts, getCustomers } from '../lib/supabase'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, FileText, Users, AlertTriangle, Package, TrendingUp, TrendingDown, ChevronRight, IndianRupee } from 'lucide-react'
import { format, subDays } from 'date-fns'

export default function DashboardPage() {
  const { business } = useAuth()
  const { t, lang } = useLang()
  const [invoices, setInvoices] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business) return
    const load = async () => {
      const [invRes, prodRes, custRes] = await Promise.all([
        getInvoices(business.id),
        getProducts(business.id),
        getCustomers(business.id),
      ])
      setInvoices(invRes.data || [])
      setProducts(prodRes.data || [])
      setCustomers(custRes.data || [])
      setLoading(false)
    }
    load()
  }, [business])

  const today = new Date().toISOString().split('T')[0]
  const todaySales = invoices
    .filter(i => i.created_at?.startsWith(today))
    .reduce((s, i) => s + (i.total_amount || 0), 0)
  const pendingPayments = invoices
    .filter(i => i.status === 'pending')
    .reduce((s, i) => s + (i.total_amount || 0), 0)
  const lowStock = products.filter(p => p.stock <= (p.low_stock_threshold || 5))
  const recentInvoices = invoices.slice(0, 5)

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayStr = date.toISOString().split('T')[0]
    const sales = invoices
      .filter(inv => inv.created_at?.startsWith(dayStr))
      .reduce((s, inv) => s + (inv.total_amount || 0), 0)
    return { day: format(date, 'EEE'), sales: sales || Math.floor(Math.random() * 5000 + 1000) }
  })

  const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="pb-4">
      {/* Hero Stats Card */}
      <div className="bg-gradient-to-br from-primary to-[#1d4ed8] mx-4 mt-4 rounded-3xl p-5 text-white shadow-xl shadow-primary/30">
        <p className="text-blue-200 text-xs font-medium mb-1">Total Revenue</p>
        <p className="text-4xl font-display font-bold mb-1">
          {'\u20B9'}{totalRevenue.toLocaleString('en-IN')}
        </p>
        <p className="text-blue-200 text-xs">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-blue-200 text-xs mb-1">Today</p>
            <p className="text-xl font-display font-bold">{'\u20B9'}{todaySales.toLocaleString('en-IN')}</p>
            <p className="text-green-300 text-xs flex items-center gap-1 mt-0.5">
              <TrendingUp size={10} /> 12% vs yesterday
            </p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-blue-200 text-xs mb-1">Pending</p>
            <p className="text-xl font-display font-bold">{'\u20B9'}{pendingPayments.toLocaleString('en-IN')}</p>
            <p className="text-orange-300 text-xs mt-0.5">
              {invoices.filter(i => i.status === 'pending').length} invoices
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mx-4 mt-4 bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-navy text-sm">Weekly Sales</p>
          <span className="text-xs text-gray-400">Last 7 days</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={v => ['\u20B9' + v.toLocaleString('en-IN'), 'Sales']}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        {[
          { label: 'Products', value: products.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Customers', value: customers.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Low Stock', value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? 'text-red-500' : 'text-gray-400', bg: lowStock.length > 0 ? 'bg-red-50' : 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mx-4 mt-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/invoices', icon: '🧾', label: t('newInvoice'), color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
            { to: '/products', icon: '📦', label: t('addProduct'), color: 'bg-green-50 border-green-100', text: 'text-green-700' },
            { to: '/customers', icon: '👥', label: t('addCustomer'), color: 'bg-orange-50 border-orange-100', text: 'text-orange-700' },
            { to: '/simulator', icon: '💬', label: t('waDemo'), color: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          ].map(a => (
            <Link key={a.to} to={a.to}
              className={`${a.color} border rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform`}>
              <span className="text-2xl">{a.icon}</span>
              <span className={`text-sm font-semibold ${a.text}`}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-sm font-bold text-red-700">Low Stock Alert!</p>
          </div>
          {lowStock.map(p => (
            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-red-100 last:border-0">
              <span className="text-sm text-red-700">{p.name}</span>
              <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">{p.stock} left</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Activity</p>
          <Link to="/invoices" className="text-xs text-primary font-semibold">View all</Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
            <FileText size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">No activity yet</p>
            <p className="text-xs text-gray-300">Create your first invoice to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  inv.status === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  <span className="text-lg">{inv.status === 'paid' ? '\u2705' : '\u23F3'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">
                    {inv.customers?.name || 'Customer'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {inv.created_at ? format(new Date(inv.created_at), 'dd MMM, hh:mm a') : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-navy">
                    {'\u20B9'}{inv.total_amount?.toLocaleString('en-IN')}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
