// src/pages/ReportsPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getInvoices, getCustomers } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'

const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ReportsPage() {
  const { business } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [period, setPeriod] = useState('weekly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business) return
    const load = async () => {
      setLoading(true)
      const [invRes, custRes] = await Promise.all([
        getInvoices(business.id),
        getCustomers(business.id),
      ])
      setInvoices(invRes.data || [])
      setCustomers(custRes.data || [])
      setLoading(false)
    }
    load()
  }, [business])

  // Daily chart data (last 7 or 30 days)
  const days = period === 'weekly' ? 7 : 30
  const chartData = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayInvoices = invoices.filter(inv => inv.created_at?.startsWith(dateStr))
    return {
      label: format(date, period === 'weekly' ? 'EEE' : 'dd'),
      sales: dayInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0),
      count: dayInvoices.length,
    }
  })

  // Top customers by spend
  const topCustomers = customers
    .map(c => ({
      name: c.name,
      total: invoices.filter(inv => inv.customer_id === c.id).reduce((s, inv) => s + (inv.total_amount || 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Payment status breakdown
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0)
  const pendingTotal = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || 0), 0)
  const pieData = [
    { name: 'Paid', value: paidTotal },
    { name: 'Pending', value: pendingTotal },
  ].filter(d => d.value > 0)

  const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0)

  const exportCSV = () => {
    const rows = [
      ['Invoice ID', 'Customer', 'Amount', 'Status', 'Date'],
      ...invoices.map(inv => [
        inv.id?.slice(0, 8),
        inv.customers?.name || '',
        inv.total_amount,
        inv.status,
        inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '',
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vyaparmitra-report-${format(new Date(), 'dd-MM-yyyy')}.csv`
    a.click()
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">Reports</h1>
          <p className="text-sm text-gray-500">Business performance overview</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all shadow-sm"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'text-primary', bg: 'bg-blue-50' },
          { label: 'Paid Amount', value: `₹${paidTotal.toLocaleString('en-IN')}`, color: 'text-success', bg: 'bg-green-50' },
          { label: 'Pending', value: `₹${pendingTotal.toLocaleString('en-IN')}`, color: 'text-alert', bg: 'bg-orange-50' },
          { label: 'Total Orders', value: invoices.length, color: 'text-navy', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center border border-gray-100`}>
            <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-navy">Sales Trend</h2>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {['weekly', 'monthly'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${period === p ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={period === 'monthly' ? 8 : 20}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Sales']}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
            />
            <Bar dataKey="sales" fill="#2563EB" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-display font-bold text-navy mb-4">Top Customers</h2>
          {topCustomers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No customer data yet</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: COLORS[i % COLORS.length] }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-navy">{c.name}</span>
                      <span className="text-sm font-bold text-navy">₹{c.total.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${topCustomers[0].total > 0 ? (c.total / topCustomers[0].total) * 100 : 0}%`,
                          background: COLORS[i % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-display font-bold text-navy mb-4">Payment Status</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No invoice data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#16A34A' : '#F59E0B'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: i === 0 ? '#16A34A' : '#F59E0B' }} />
                    <div>
                      <p className="text-xs text-gray-500">{d.name}</p>
                      <p className="text-sm font-bold text-navy">₹{d.value.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
