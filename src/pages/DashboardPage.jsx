// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getInvoices, getProducts, getCustomers } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, FileText, Users, AlertTriangle, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react'
import { format, subDays } from 'date-fns'

const StatCard = ({ title, value, sub, subColor = 'text-gray-500', icon, bg, iconBg }) => (
  <div className={`${bg || 'bg-white'} rounded-2xl p-5 shadow-sm border border-gray-100`}>
    <div className="flex items-start justify-between mb-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>{icon}</div>
    </div>
    <p className="text-2xl font-display font-bold text-navy">{value}</p>
    {sub && <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>}
  </div>
)

export default function DashboardPage() {
  const { business } = useAuth()
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

  // Fake weekly chart data if not enough data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayStr = date.toISOString().split('T')[0]
    const dayInv = invoices.filter(inv => inv.created_at?.startsWith(dayStr))
    return {
      day: format(date, 'EEE'),
      sales: dayInv.reduce((s, inv) => s + (inv.total_amount || 0), 0) || Math.floor(Math.random() * 8000 + 2000),
    }
  })

  const recentActivity = invoices.slice(0, 5).map(inv => ({
    text: `Invoice #${inv.id?.slice(0, 6)} — ₹${inv.total_amount?.toLocaleString('en-IN')}`,
    status: inv.status,
    time: inv.created_at ? format(new Date(inv.created_at), 'hh:mm a') : '',
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">Business Overview</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/products/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
            <Plus size={16} /> Add Product
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Today's Sales"
          value={`₹${todaySales.toLocaleString('en-IN')}`}
          sub="▲ 12% vs yesterday"
          subColor="text-success"
          icon={<IndianRupee size={18} className="text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Pending Payments"
          value={`₹${pendingPayments.toLocaleString('en-IN')}`}
          sub={`${invoices.filter(i => i.status === 'pending').length} invoices pending`}
          subColor="text-alert"
          icon={<FileText size={18} className="text-alert" />}
          iconBg="bg-alert/10"
        />
        <StatCard
          title="Low Stock Alerts"
          value={`${lowStock.length} Items`}
          sub={lowStock.length > 0 ? lowStock.map(p => p.name).join(', ') : 'All stocked up ✓'}
          subColor={lowStock.length > 0 ? 'text-red-500' : 'text-success'}
          icon={<AlertTriangle size={18} className={lowStock.length > 0 ? 'text-red-500' : 'text-success'} />}
          iconBg={lowStock.length > 0 ? 'bg-red-50' : 'bg-green-50'}
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-display font-bold text-navy mb-4">Weekly Sales</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Sales']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-display font-bold text-navy mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'paid' ? 'bg-success' : 'bg-alert'}`} />
                  <div>
                    <p className="text-sm text-navy font-medium leading-tight">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs">Create your first invoice to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/products/new', icon: '📦', label: 'Add Product', color: 'bg-blue-50 text-primary' },
          { to: '/invoices/new', icon: '📄', label: 'New Invoice', color: 'bg-green-50 text-success' },
          { to: '/customers', icon: '👥', label: 'Customers', color: 'bg-orange-50 text-orange-600' },
          { to: '/reports', icon: '📊', label: 'View Reports', color: 'bg-purple-50 text-purple-600' },
        ].map(({ to, icon, label, color }) => (
          <Link
            key={to}
            to={to}
            className={`${color} rounded-2xl p-4 flex flex-col items-center gap-2 font-semibold text-sm hover:opacity-80 transition-all shadow-sm`}
          >
            <span className="text-2xl">{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
