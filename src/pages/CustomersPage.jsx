// src/pages/CustomersPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCustomers, addCustomer, updateCustomer, getInvoices } from '../lib/supabase'
import { Plus, Search, Edit2, Phone, Users, ChevronRight, IndianRupee, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const EMPTY = { name: '', phone: '' }

export default function CustomersPage() {
  const { business } = useAuth()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [selectedInvoices, setSelectedInvoices] = useState([])

  const load = async () => {
    if (!business) return
    setLoading(true)
    const { data } = await getCustomers(business.id)
    setCustomers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [business])

  const openCustomer = async (c) => {
    setSelected(c)
    const { data } = await getInvoices(business.id)
    setSelectedInvoices((data || []).filter(inv => inv.customer_id === c.id))
  }

  const handleSave = async () => {
    if (!form.name || !form.phone) return toast.error('Name and phone are required')
    setSaving(true)
    if (editing) {
      const { error } = await updateCustomer(editing.id, form)
      if (error) toast.error('Failed to update')
      else toast.success('Customer updated!')
    } else {
      const { error } = await addCustomer(business.id, { ...form, total_due: 0 })
      if (error) toast.error('Failed to add customer')
      else toast.success('Customer added!')
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const sendReminder = (c) => {
    const msg = `Hello ${c.name}, you have a pending payment of ₹${c.total_due?.toLocaleString('en-IN')} due to ${business?.name}. Please clear at your earliest. Thank you!`
    const url = `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} customers in your network</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-display font-bold text-primary">{customers.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Customers</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-display font-bold text-alert">
            ₹{customers.reduce((s, c) => s + (c.total_due || 0), 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total Outstanding</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-display font-bold text-red-500">
            {customers.filter(c => (c.total_due || 0) > 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Have Pending Due</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
        />
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Users size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No customers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {filtered.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => openCustomer(c)}
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">{c.name[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy truncate">{c.name}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Phone size={12} /> {c.phone}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-sm ${(c.total_due || 0) > 0 ? 'text-red-500' : 'text-success'}`}>
                  {(c.total_due || 0) > 0 ? `₹${c.total_due?.toLocaleString('en-IN')} due` : '✓ Clear'}
                </p>
                {c.last_order_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(c.last_order_date), 'dd MMM')}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{selected.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-navy">{selected.name}</h2>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} /> {selected.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-navy p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-600">₹{selected.total_due?.toLocaleString('en-IN') || 0}</p>
                  <p className="text-xs text-red-400">Total Due</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{selectedInvoices.length}</p>
                  <p className="text-xs text-blue-400">Total Orders</p>
                </div>
              </div>

              {/* Order History */}
              <h3 className="font-bold text-navy mb-3">Order History</h3>
              {selectedInvoices.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-2 mb-6">
                  {selectedInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-navy">Invoice #{inv.id?.slice(0, 8)}</p>
                        <p className="text-xs text-gray-400">{inv.created_at ? format(new Date(inv.created_at), 'dd MMM yyyy') : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-navy">₹{inv.total_amount?.toLocaleString('en-IN')}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(selected.total_due || 0) > 0 && (
                <button
                  onClick={() => sendReminder(selected)}
                  className="w-full py-3 bg-success text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>💬</span> Send WhatsApp Reminder
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-xl font-display font-bold text-navy mb-6">
              {editing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Full Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Ramesh Kumar"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Phone Number</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-500 text-sm">+91</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="9876543210"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
