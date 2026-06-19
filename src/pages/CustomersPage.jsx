// src/pages/CustomersPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { getCustomers, getInvoices, addCustomer, updateCustomer } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  Plus, Search, Phone, ChevronRight, X, Edit2,
  Trash2, MessageSquare, IndianRupee, FileText,
  ArrowLeft, Check, User, Calendar
} from 'lucide-react'

export default function CustomersPage() {
  const { business } = useAuth()
  const { t, lang } = useLang()

  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | due | clear

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)   // customer object to edit
  const [viewCustomer, setViewCustomer] = useState(null)   // customer object to view details
  const [deleteConfirm, setDeleteConfirm] = useState(null) // customer id to delete

  // Form state
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (business) load() }, [business])

  const load = async () => {
    setLoading(true)
    const [cRes, iRes] = await Promise.all([
      getCustomers(business.id),
      getInvoices(business.id),
    ])
    setCustomers(cRes.data || [])
    setInvoices(iRes.data || [])
    setLoading(false)
  }

  // ─── Derived data ──────────────────────────────────────────
  const filtered = customers.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const matchFilter = filter === 'all' ? true
      : filter === 'due' ? (c.total_due || 0) > 0
      : (c.total_due || 0) === 0
    return matchSearch && matchFilter
  })

  const totalOutstanding = customers.reduce((s, c) => s + (c.total_due || 0), 0)
  const withDue = customers.filter(c => (c.total_due || 0) > 0).length

  const custInvoices = (custId) => invoices.filter(i => i.customer_id === custId)
  const custTotal = (custId) => custInvoices(custId).reduce((s, i) => s + (i.total_amount || 0), 0)

  // ─── Add / Edit ────────────────────────────────────────────
  const openAdd = () => { setForm({ name: '', phone: '' }); setShowAdd(true) }

  const openEdit = (cust) => {
    setForm({ name: cust.name || '', phone: cust.phone || '' })
    setEditCustomer(cust)
    setViewCustomer(null)
  }

  const saveCustomer = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)

    if (editCustomer) {
      const { error } = await updateCustomer(editCustomer.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
      })
      setSaving(false)
      if (error) return toast.error('Failed to update: ' + error.message)
      toast.success(lang === 'te' ? 'కస్టమర్ అప్‌డేట్ అయింది!' : 'Customer updated!')
      setEditCustomer(null)
    } else {
      const { error } = await addCustomer(business.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        total_due: 0,
      })
      setSaving(false)
      if (error) return toast.error('Failed to add: ' + error.message)
      toast.success(lang === 'te' ? 'కస్టమర్ జోడించబడ్డారు!' : 'Customer added!')
      setShowAdd(false)
    }
    load()
  }

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return toast.error('Failed to delete: ' + error.message)
    toast.success('Customer deleted')
    setDeleteConfirm(null)
    setViewCustomer(null)
    load()
  }

  // ─── WhatsApp reminder ─────────────────────────────────────
  const sendReminder = (cust) => {
    if (!cust.phone) return toast.error('No phone number saved for this customer')
    const msg = encodeURIComponent(
      `Hello ${cust.name}! 👋\n\nThis is a reminder from *${business.name}*.\n\nYou have a pending payment of *Rs.${cust.total_due?.toLocaleString('en-IN')}*.\n\nPlease pay at your earliest convenience.\n\nThank you! 🙏`
    )
    window.open(`https://wa.me/91${cust.phone.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  // ─── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  // ─── View Customer Detail ──────────────────────────────────
  if (viewCustomer) {
    const cust = viewCustomer
    const cInvs = custInvoices(cust.id)
    const cTotal = custTotal(cust.id)
    return (
      <div className="pb-6">
        {/* Header */}
        <div className="bg-navy text-white px-4 pt-4 pb-6">
          <button onClick={() => setViewCustomer(null)}
            className="flex items-center gap-2 text-blue-300 text-sm mb-4">
            <ArrowLeft size={16} /> {lang === 'te' ? 'వెనుకకు' : 'Back'}
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
              {cust.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">{cust.name}</h2>
              <p className="text-blue-300 text-sm flex items-center gap-1">
                <Phone size={12} />
                {cust.phone || (lang === 'te' ? 'ఫోన్ లేదు' : 'No phone')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: lang === 'te' ? 'మొత్తం వ్యాపారం' : 'Total Business', value: `₹${cTotal.toLocaleString('en-IN')}`, color: 'text-white' },
              { label: lang === 'te' ? 'బాకీ' : 'Total Due', value: `₹${(cust.total_due || 0).toLocaleString('en-IN')}`, color: (cust.total_due || 0) > 0 ? 'text-red-300' : 'text-green-300' },
              { label: lang === 'te' ? 'ఆర్డర్లు' : 'Orders', value: cInvs.length, color: 'text-blue-200' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-blue-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => openEdit(cust)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-semibold">
              <Edit2 size={15} /> {lang === 'te' ? 'సవరించు' : 'Edit'}
            </button>
            {(cust.total_due || 0) > 0 && (
              <button onClick={() => sendReminder(cust)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-semibold">
                <MessageSquare size={15} /> {lang === 'te' ? 'రిమైండర్' : 'Reminder'}
              </button>
            )}
            <button onClick={() => setDeleteConfirm(cust.id)}
              className="w-12 flex items-center justify-center py-3 bg-red-50 text-red-500 rounded-xl">
              <Trash2 size={16} />
            </button>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">
              {lang === 'te' ? 'సంప్రదింపు వివరాలు' : 'Contact Details'}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Phone size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy">
                  {cust.phone ? `+91 ${cust.phone}` : (lang === 'te' ? 'ఫోన్ నంబర్ లేదు' : 'No phone number')}
                </p>
                <p className="text-xs text-gray-400">{lang === 'te' ? 'ఫోన్' : 'Mobile'}</p>
              </div>
              {cust.phone && (
                <a href={`tel:+91${cust.phone}`}
                  className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-semibold">
                  Call
                </a>
              )}
            </div>
            {cust.last_order_date && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Calendar size={16} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {format(new Date(cust.last_order_date), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-gray-400">{lang === 'te' ? 'చివరి ఆర్డర్' : 'Last Order'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Invoice History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">
              {lang === 'te' ? 'ఆర్డర్ చరిత్ర' : 'Order History'} ({cInvs.length})
            </p>
            {cInvs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {lang === 'te' ? 'ఇంకా ఆర్డర్లు లేవు' : 'No orders yet'}
              </p>
            ) : (
              <div className="space-y-2">
                {cInvs.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        #{inv.id?.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inv.created_at ? format(new Date(inv.created_at), 'dd MMM yyyy') : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-navy">
                        ₹{inv.total_amount?.toLocaleString('en-IN')}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {inv.status === 'paid'
                          ? (lang === 'te' ? 'చెల్లించారు' : 'Paid')
                          : (lang === 'te' ? 'పెండింగ్' : 'Pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delete confirm modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <h3 className="font-bold text-navy text-lg mb-2">
                {lang === 'te' ? 'కస్టమర్ తొలగించాలా?' : 'Delete Customer?'}
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                {lang === 'te'
                  ? 'ఈ కస్టమర్ మరియు వారి అన్ని రికార్డులు తొలగించబడతాయి.'
                  : 'This will delete the customer and all their records permanently.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                  {lang === 'te' ? 'రద్దు' : 'Cancel'}
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold">
                  {lang === 'te' ? 'తొలగించు' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Edit Customer Modal ───────────────────────────────────
  if (editCustomer) {
    return (
      <div className="pb-6">
        <div className="bg-navy text-white px-4 pt-4 pb-6">
          <button onClick={() => setEditCustomer(null)}
            className="flex items-center gap-2 text-blue-300 text-sm mb-4">
            <ArrowLeft size={16} /> {lang === 'te' ? 'వెనుకకు' : 'Back'}
          </button>
          <h2 className="text-xl font-display font-bold">
            {lang === 'te' ? 'కస్టమర్ సవరించండి' : 'Edit Customer'}
          </h2>
        </div>
        <div className="px-4 py-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                {lang === 'te' ? 'పూర్తి పేరు' : 'Full Name'} *
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={lang === 'te' ? 'కస్టమర్ పేరు' : 'Customer name'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                {lang === 'te' ? 'ఫోన్ నంబర్' : 'Phone Number'}
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                  +91
                </div>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="98765 43210"
                  type="tel"
                  maxLength={10}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-navy"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'te' ? 'WhatsApp రిమైండర్లు పంపడానికి అవసరం' : 'Required for WhatsApp payment reminders'}
              </p>
            </div>
          </div>
          <button
            onClick={saveCustomer}
            disabled={saving}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl disabled:opacity-50 shadow-lg shadow-primary/30"
          >
            {saving
              ? (lang === 'te' ? 'సేవ్ అవుతోంది...' : 'Saving...')
              : (lang === 'te' ? 'సేవ్ చేయండి' : 'Save Changes')}
          </button>
        </div>
      </div>
    )
  }

  // ─── Main List ─────────────────────────────────────────────
  return (
    <div className="pb-6">
      {/* Stats */}
      <div className="px-4 pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">
              {lang === 'te' ? 'మొత్తం కస్టమర్లు' : 'Total Customers'}
            </p>
            <p className="text-2xl font-display font-bold text-primary">{customers.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">
              {lang === 'te' ? 'మొత్తం బాకీ' : 'Total Outstanding'}
            </p>
            <p className="text-xl font-display font-bold text-alert">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        {withDue > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
            <p className="text-sm font-bold text-red-600">
              {withDue} {lang === 'te' ? 'కస్టమర్లకు బాకీ ఉంది' : 'customers have pending dues'}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'te' ? 'పేరు లేదా ఫోన్ ద్వారా వెతకండి...' : 'Search by name or phone...'}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: lang === 'te' ? 'అందరూ' : 'All', count: customers.length },
            { key: 'due', label: lang === 'te' ? 'బాకీ' : 'Due', count: withDue },
            { key: 'clear', label: lang === 'te' ? 'క్లియర్' : 'Clear', count: customers.length - withDue },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}>
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      <div className="px-4 mt-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <User size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-400">
              {search
                ? (lang === 'te' ? 'కస్టమర్లు కనుగొనలేదు' : 'No customers found')
                : (lang === 'te' ? 'ఇంకా కస్టమర్లు లేరు' : 'No customers yet')}
            </p>
            {!search && (
              <button onClick={openAdd}
                className="mt-3 text-sm text-primary font-semibold">
                + {lang === 'te' ? 'కస్టమర్ జోడించండి' : 'Add your first customer'}
              </button>
            )}
          </div>
        ) : filtered.map(cust => {
          const due = cust.total_due || 0
          const hasDue = due > 0
          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"
            >
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                hasDue ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
              }`}>
                {cust.name?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={() => setViewCustomer(cust)}>
                <p className="text-sm font-bold text-navy truncate">{cust.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Phone size={10} />
                  {cust.phone
                    ? `+91 ${cust.phone}`
                    : <span className="text-orange-400">{lang === 'te' ? 'ఫోన్ లేదు' : 'No phone'}</span>}
                </p>
              </div>

              {/* Due / Clear */}
              <div className="text-right flex-shrink-0" onClick={() => setViewCustomer(cust)}>
                {hasDue ? (
                  <>
                    <p className="text-sm font-bold text-red-500">
                      ₹{due.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-red-400">
                      {lang === 'te' ? 'బాకీ' : 'due'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-success flex items-center gap-0.5 justify-end">
                      <Check size={12} /> {lang === 'te' ? 'క్లియర్' : 'Clear'}
                    </p>
                    {cust.last_order_date && (
                      <p className="text-xs text-gray-400">
                        {format(new Date(cust.last_order_date), 'dd MMM')}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={() => openEdit(cust)}
                className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-1 active:bg-gray-100"
              >
                <Edit2 size={14} className="text-gray-400" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add Customer FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-4 bg-primary text-white w-14 h-14 rounded-2xl shadow-xl shadow-primary/40 flex items-center justify-center z-40"
      >
        <Plus size={24} />
      </button>

      {/* Add Customer Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-display font-bold text-navy">
                {lang === 'te' ? 'కొత్త కస్టమర్' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowAdd(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {lang === 'te' ? 'పూర్తి పేరు' : 'Full Name'} *
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={lang === 'te' ? 'కస్టమర్ పేరు ఇవ్వండి' : 'Enter customer name'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-navy"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {lang === 'te' ? 'ఫోన్ నంబర్' : 'Phone Number'}
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium">
                    +91
                  </div>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="98765 43210"
                    type="tel"
                    maxLength={10}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-navy"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {lang === 'te' ? 'WhatsApp రిమైండర్లకు ఉపయోగించబడుతుంది' : 'Used for WhatsApp payment reminders'}
                </p>
              </div>
              <button
                onClick={saveCustomer}
                disabled={saving || !form.name.trim()}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl disabled:opacity-50 shadow-lg shadow-primary/30"
              >
                {saving
                  ? (lang === 'te' ? 'జోడిస్తోంది...' : 'Adding...')
                  : (lang === 'te' ? 'కస్టమర్ జోడించండి' : 'Add Customer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
