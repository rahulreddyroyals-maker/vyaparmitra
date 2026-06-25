// src/pages/ReportsPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { getInvoices, getCustomers, getProducts } from '../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Download, TrendingUp, TrendingDown, Users,
  FileText, Package, IndianRupee, Calendar,
  ChevronDown, ArrowLeft, ArrowRight
} from 'lucide-react'
import { format, subDays, subMonths, startOfDay, endOfDay,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, parseISO,
  isWithinInterval, isSameDay, getMonth, getYear } from 'date-fns'
import toast from 'react-hot-toast'

const PERIODS = [
  { key: 'daily',   label: 'Daily',   labelTe: 'రోజువారీ' },
  { key: 'monthly', label: 'Monthly', labelTe: 'నెలవారీ' },
  { key: 'yearly',  label: 'Yearly',  labelTe: 'వార్షిక' },
]

export default function ReportsPage() {
  const { business } = useAuth()
  const { lang } = useLang()

  const [period, setPeriod] = useState('monthly')
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Navigation: which day/month/year we're viewing
  const [offset, setOffset] = useState(0) // 0 = current, -1 = previous, etc.

  useEffect(() => {
    if (business) load()
  }, [business])

  const load = async () => {
    setLoading(true)
    const [iRes, cRes, pRes] = await Promise.all([
      getInvoices(business.id),
      getCustomers(business.id),
      getProducts(business.id),
    ])
    setInvoices(iRes.data || [])
    setCustomers(cRes.data || [])
    setProducts(pRes.data || [])
    setLoading(false)
  }

  // ─── Date range for current view ─────────────────────────────────────────────
  const getDateRange = () => {
    const now = new Date()
    if (period === 'daily') {
      const day = subDays(now, -offset) // offset is negative for past
      return {
        start: startOfDay(day),
        end: endOfDay(day),
        label: format(day, 'dd MMM yyyy'),
        prevLabel: format(subDays(day, 1), 'dd MMM'),
      }
    }
    if (period === 'monthly') {
      const month = subMonths(now, -offset)
      return {
        start: startOfMonth(month),
        end: endOfMonth(month),
        label: format(month, 'MMMM yyyy'),
        prevLabel: format(subMonths(month, 1), 'MMM yyyy'),
      }
    }
    // yearly
    const year = new Date(now.getFullYear() + offset, 0, 1)
    return {
      start: startOfYear(year),
      end: endOfYear(year),
      label: format(year, 'yyyy'),
      prevLabel: format(new Date(year.getFullYear() - 1, 0, 1), 'yyyy'),
    }
  }

  const range = getDateRange()

  // ─── Filter invoices to current range ────────────────────────────────────────
  const rangeInvoices = invoices.filter(inv => {
    if (!inv.created_at) return false
    const d = parseISO(inv.created_at)
    return isWithinInterval(d, { start: range.start, end: range.end })
  })

  // Previous period invoices for comparison
  const getPrevRange = () => {
    const now = new Date()
    if (period === 'daily') {
      const day = subDays(subDays(now, -offset), 1)
      return { start: startOfDay(day), end: endOfDay(day) }
    }
    if (period === 'monthly') {
      const month = subMonths(subMonths(now, -offset), 1)
      return { start: startOfMonth(month), end: endOfMonth(month) }
    }
    const year = new Date(now.getFullYear() + offset - 1, 0, 1)
    return { start: startOfYear(year), end: endOfYear(year) }
  }

  const prevRange = getPrevRange()
  const prevInvoices = invoices.filter(inv => {
    if (!inv.created_at) return false
    const d = parseISO(inv.created_at)
    return isWithinInterval(d, { start: prevRange.start, end: prevRange.end })
  })

  // ─── Metrics ──────────────────────────────────────────────────────────────────
  const totalRevenue = rangeInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const paidAmount = rangeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0)
  const pendingAmount = rangeInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || 0), 0)
  const orderCount = rangeInvoices.length
  const paidCount = rangeInvoices.filter(i => i.status === 'paid').length

  const prevRevenue = prevInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const revenueChange = prevRevenue > 0
    ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
    : totalRevenue > 0 ? 100 : 0

  // ─── Chart data ───────────────────────────────────────────────────────────────
  const getChartData = () => {
    if (period === 'daily') {
      // Hours of the day
      return Array.from({ length: 24 }, (_, h) => {
        const hourInvs = rangeInvoices.filter(inv => {
          const d = parseISO(inv.created_at)
          return d.getHours() === h
        })
        return {
          label: h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`,
          sales: hourInvs.reduce((s, i) => s + (i.total_amount || 0), 0),
          orders: hourInvs.length,
        }
      }).filter(d => d.sales > 0 || true).slice(6, 22) // show 6AM to 10PM
    }

    if (period === 'monthly') {
      // Days of the month
      const days = eachDayOfInterval({ start: range.start, end: range.end })
      return days.map(day => {
        const dayInvs = rangeInvoices.filter(inv => isSameDay(parseISO(inv.created_at), day))
        return {
          label: format(day, 'd'),
          sales: dayInvs.reduce((s, i) => s + (i.total_amount || 0), 0),
          orders: dayInvs.length,
        }
      })
    }

    // Yearly: months
    const months = eachMonthOfInterval({ start: range.start, end: range.end })
    return months.map(month => {
      const monthInvs = rangeInvoices.filter(inv => {
        const d = parseISO(inv.created_at)
        return getMonth(d) === getMonth(month) && getYear(d) === getYear(month)
      })
      return {
        label: format(month, 'MMM'),
        sales: monthInvs.reduce((s, i) => s + (i.total_amount || 0), 0),
        orders: monthInvs.length,
      }
    })
  }

  const chartData = getChartData()

  // ─── Top customers in range ───────────────────────────────────────────────────
  const topCustomers = customers
    .map(c => {
      const cInvs = rangeInvoices.filter(i => i.customer_id === c.id)
      return {
        ...c,
        periodRevenue: cInvs.reduce((s, i) => s + (i.total_amount || 0), 0),
        periodOrders: cInvs.length,
      }
    })
    .filter(c => c.periodRevenue > 0)
    .sort((a, b) => b.periodRevenue - a.periodRevenue)
    .slice(0, 5)

  // ─── CSV Export ───────────────────────────────────────────────────────────────
  const exportInvoicesCSV = () => {
    const rows = [
      ['Invoice ID', 'Date', 'Customer Name', 'Customer Phone', 'Amount', 'Status', 'Payment Method'],
      ...rangeInvoices.map(inv => {
        const cust = customers.find(c => c.id === inv.customer_id)
        return [
          inv.id?.slice(0, 8).toUpperCase(),
          inv.created_at ? format(parseISO(inv.created_at), 'dd/MM/yyyy') : '',
          cust?.name || '',
          cust?.phone ? `+91${cust.phone}` : '',
          inv.total_amount || 0,
          inv.status || '',
          inv.payment_method || 'cash',
        ]
      })
    ]
    downloadCSV(rows, `invoices-${range.label}-${business.name}`)
    toast.success('Invoices exported!')
  }

  const exportCustomersCSV = () => {
    const rows = [
      ['Customer Name', 'Phone', 'Total Business (All Time)', 'Total Due', 'Orders in Period', 'Revenue in Period', 'Last Order Date'],
      ...customers.map(c => {
        const allInvs = invoices.filter(i => i.customer_id === c.id)
        const periodCustInvs = rangeInvoices.filter(i => i.customer_id === c.id)
        return [
          c.name || '',
          c.phone ? `+91${c.phone}` : 'No phone',
          allInvs.reduce((s, i) => s + (i.total_amount || 0), 0),
          c.total_due || 0,
          periodCustInvs.length,
          periodCustInvs.reduce((s, i) => s + (i.total_amount || 0), 0),
          c.last_order_date ? format(parseISO(c.last_order_date), 'dd/MM/yyyy') : '',
        ]
      }).sort((a, b) => b[2] - a[2])
    ]
    downloadCSV(rows, `customers-${range.label}-${business.name}`)
    toast.success('Customer report exported!')
  }

  const exportPendingDuesCSV = () => {
    const withDue = customers.filter(c => (c.total_due || 0) > 0)
    const rows = [
      ['Customer Name', 'Phone', 'Amount Due', 'Last Order Date', 'Pending Invoices'],
      ...withDue
        .sort((a, b) => (b.total_due || 0) - (a.total_due || 0))
        .map(c => {
          const pendingInvs = invoices.filter(i => i.customer_id === c.id && i.status === 'pending')
          return [
            c.name || '',
            c.phone ? `+91${c.phone}` : 'No phone',
            c.total_due || 0,
            c.last_order_date ? format(parseISO(c.last_order_date), 'dd/MM/yyyy') : '',
            pendingInvs.length,
          ]
        })
    ]
    downloadCSV(rows, `pending-dues-${format(new Date(), 'dd-MM-yyyy')}-${business.name}`)
    toast.success('Pending dues exported!')
  }

  const exportSummaryCSV = () => {
    const rows = [
      [`VyaparMitra Business Report - ${business.name}`],
      [`Period: ${range.label}`],
      [`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
      ['SUMMARY'],
      ['Total Revenue', `Rs.${totalRevenue.toLocaleString('en-IN')}`],
      ['Paid Amount', `Rs.${paidAmount.toLocaleString('en-IN')}`],
      ['Pending Amount', `Rs.${pendingAmount.toLocaleString('en-IN')}`],
      ['Total Orders', orderCount],
      ['Paid Orders', paidCount],
      ['Pending Orders', orderCount - paidCount],
      ['Revenue Change vs Previous Period', `${revenueChange > 0 ? '+' : ''}${revenueChange}%`],
      [],
      ['TOP CUSTOMERS (This Period)'],
      ['Name', 'Phone', 'Revenue', 'Orders'],
      ...topCustomers.map(c => [c.name, c.phone ? `+91${c.phone}` : 'No phone', `Rs.${c.periodRevenue.toLocaleString('en-IN')}`, c.periodOrders]),
      [],
      ['ALL INVOICES'],
      ['Invoice ID', 'Date', 'Customer', 'Phone', 'Amount', 'Status'],
      ...rangeInvoices.map(inv => {
        const cust = customers.find(c => c.id === inv.customer_id)
        return [
          inv.id?.slice(0, 8).toUpperCase(),
          inv.created_at ? format(parseISO(inv.created_at), 'dd/MM/yyyy') : '',
          cust?.name || '',
          cust?.phone ? `+91${cust.phone}` : '',
          `Rs.${inv.total_amount?.toLocaleString('en-IN')}`,
          inv.status,
        ]
      }),
    ]
    downloadCSV(rows, `summary-report-${range.label}-${business.name}`)
    toast.success('Full report exported!')
  }

  const downloadCSV = (rows, filename) => {
    const csv = rows.map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = (n) => `\u20B9${n.toLocaleString('en-IN')}`

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="pb-6">
      {/* Period Selector */}
      <div className="px-4 pt-4">
        <div className="flex p-1 bg-gray-100 rounded-2xl mb-4">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setOffset(0) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                period === p.key ? 'bg-white shadow text-navy' : 'text-gray-500'
              }`}>
              {lang === 'te' ? p.labelTe : p.label}
            </button>
          ))}
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
          <button onClick={() => setOffset(o => o - 1)}
            className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div className="text-center">
            <p className="font-display font-bold text-navy">{range.label}</p>
            <p className="text-xs text-gray-400">
              {revenueChange !== 0 && (
                <span className={revenueChange > 0 ? 'text-success' : 'text-red-500'}>
                  {revenueChange > 0 ? '▲' : '▼'} {Math.abs(revenueChange)}% vs {range.prevLabel}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setOffset(o => Math.min(0, o + 1))}
            disabled={offset >= 0}
            className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center disabled:opacity-30">
            <ArrowRight size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: lang === 'te' ? 'మొత్తం ఆదాయం' : 'Total Revenue', value: fmt(totalRevenue), color: 'text-primary', bg: 'bg-blue-50', icon: IndianRupee },
            { label: lang === 'te' ? 'చెల్లించారు' : 'Paid', value: fmt(paidAmount), color: 'text-success', bg: 'bg-green-50', icon: TrendingUp },
            { label: lang === 'te' ? 'పెండింగ్' : 'Pending', value: fmt(pendingAmount), color: 'text-alert', bg: 'bg-amber-50', icon: TrendingDown },
            { label: lang === 'te' ? 'ఆర్డర్లు' : 'Orders', value: orderCount, color: 'text-purple-600', bg: 'bg-purple-50', icon: FileText },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-8 h-8 ${card.bg} rounded-xl flex items-center justify-center mb-2`}>
                <card.icon size={16} className={card.color} />
              </div>
              <p className={`text-xl font-display font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-sm font-bold text-navy mb-3">
            {lang === 'te' ? 'విక్రయాల ట్రెండ్' : 'Sales Trend'} — {range.label}
          </p>
          {chartData.some(d => d.sales > 0) ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  interval={period === 'monthly' ? 4 : 0} />
                <Tooltip
                  formatter={v => [`\u20B9${v.toLocaleString('en-IN')}`, 'Sales']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11 }}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                {lang === 'te' ? 'ఈ కాలంలో డేటా లేదు' : 'No sales data for this period'}
              </p>
            </div>
          )}
        </div>

        {/* Top Customers */}
        {topCustomers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <p className="text-sm font-bold text-navy mb-3">
              {lang === 'te' ? 'టాప్ కస్టమర్లు' : 'Top Customers'} — {range.label}
            </p>
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-primary'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.phone ? `+91 ${c.phone}` : (lang === 'te' ? 'ఫోన్ లేదు' : 'No phone')} · {c.periodOrders} orders
                  </p>
                </div>
                <p className="text-sm font-bold text-primary">{fmt(c.periodRevenue)}</p>
              </div>
            ))}
          </div>
        )}

        {/* All-time stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-sm font-bold text-navy mb-3">
            {lang === 'te' ? 'మొత్తం వ్యాపారం (అన్ని కాలాలు)' : 'All-Time Business Overview'}
          </p>
          {[
            { label: lang === 'te' ? 'మొత్తం ఆదాయం' : 'Total Revenue', value: fmt(invoices.reduce((s, i) => s + (i.total_amount || 0), 0)) },
            { label: lang === 'te' ? 'మొత్తం కస్టమర్లు' : 'Total Customers', value: customers.length },
            { label: lang === 'te' ? 'మొత్తం ఆర్డర్లు' : 'Total Orders', value: invoices.length },
            { label: lang === 'te' ? 'మొత్తం పెండింగ్' : 'Total Pending', value: fmt(customers.reduce((s, c) => s + (c.total_due || 0), 0)) },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{row.label}</span>
              <span className="text-sm font-bold text-navy">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Export Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">
            {lang === 'te' ? 'CSV ఎగుమతి' : 'Export CSV'} — {range.label}
          </p>

          <button onClick={exportSummaryCSV}
            className="w-full flex items-center gap-3 bg-primary text-white py-4 px-4 rounded-2xl font-bold shadow-lg shadow-primary/30">
            <Download size={18} />
            <div className="text-left">
              <p className="text-sm">{lang === 'te' ? 'పూర్తి రిపోర్ట్' : 'Full Report'}</p>
              <p className="text-xs opacity-70">
                {lang === 'te' ? 'సారాంశం + అన్ని ఆర్డర్లు + కస్టమర్లు' : 'Summary + all orders + customers'}
              </p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportInvoicesCSV}
              className="flex items-center gap-2 bg-white border border-gray-200 text-navy py-3 px-3 rounded-xl text-sm font-semibold shadow-sm">
              <FileText size={15} className="text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold">{lang === 'te' ? 'ఇన్వాయిస్లు' : 'Invoices'}</p>
                <p className="text-xs text-gray-400">{rangeInvoices.length} records</p>
              </div>
            </button>

            <button onClick={exportCustomersCSV}
              className="flex items-center gap-2 bg-white border border-gray-200 text-navy py-3 px-3 rounded-xl text-sm font-semibold shadow-sm">
              <Users size={15} className="text-success flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold">{lang === 'te' ? 'కస్టమర్లు' : 'Customers'}</p>
                <p className="text-xs text-gray-400">{lang === 'te' ? 'ఫోన్లతో' : 'With phones'}</p>
              </div>
            </button>
          </div>

          <button onClick={exportPendingDuesCSV}
            className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 py-3 px-4 rounded-2xl text-sm font-bold">
            <IndianRupee size={16} className="text-amber-600 flex-shrink-0" />
            <div className="text-left">
              <p>{lang === 'te' ? 'పెండింగ్ బాకీలు' : 'Pending Dues List'}</p>
              <p className="text-xs font-normal text-amber-600">
                {customers.filter(c => (c.total_due || 0) > 0).length} customers · {lang === 'te' ? 'ఫోన్ నంబర్లతో' : 'with phone numbers'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
