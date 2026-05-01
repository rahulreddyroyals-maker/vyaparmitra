// src/pages/InvoicesPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getInvoices, getCustomers, getProducts, addInvoice, markInvoicePaid } from '../lib/supabase'
import { Plus, FileText, Search, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function InvoicesPage() {
  const { business } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    customer_id: '',
    due_date: '',
    items: [{ product_id: '', quantity: 1, price: 0 }],
  })

  const load = async () => {
    if (!business) return
    setLoading(true)
    const [invRes, custRes, prodRes] = await Promise.all([
      getInvoices(business.id),
      getCustomers(business.id),
      getProducts(business.id),
    ])
    setInvoices(invRes.data || [])
    setCustomers(custRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [business])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, price: 0 }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, field, value) => {
    const items = [...form.items]
    items[i][field] = value
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value)
      if (prod) items[i].price = prod.price
    }
    setForm(f => ({ ...f, items }))
  }

  const total = form.items.reduce((s, item) => s + (item.price * item.quantity), 0)

  const handleCreate = async () => {
    if (!form.customer_id) return toast.error('Select a customer')
    if (form.items.some(i => !i.product_id)) return toast.error('Select product for all items')
    setSaving(true)
    const { error } = await addInvoice(
      business.id,
      form.customer_id,
      form.items,
      total,
      form.due_date || null
    )
    setSaving(false)
    if (error) return toast.error('Failed to create invoice')
    toast.success('Invoice created!')
    setShowModal(false)
    setForm({ customer_id: '', due_date: '', items: [{ product_id: '', quantity: 1, price: 0 }] })
    load()
  }

  const handleMarkPaid = async (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId)
    if (!inv) return
    const { error } = await markInvoicePaid(invoiceId, inv.total_amount)
    if (error) toast.error('Failed to mark as paid')
    else { toast.success('Marked as paid!'); load() }
  }

  const shareWhatsApp = (inv) => {
    const customerName = inv.customers?.name || 'Customer'
    const msg = `Invoice from ${business?.name}\n\nCustomer: ${customerName}\nAmount: ₹${inv.total_amount?.toLocaleString('en-IN')}\nStatus: ${inv.status?.toUpperCase()}\nDate: ${format(new Date(inv.created_at), 'dd MMM yyyy')}\n\nThank you for your business!`
    const phone = inv.customers?.phone?.replace(/\D/g, '')
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const filtered = invoices.filter(inv => {
    const matchFilter = filter === 'all' || inv.status === filter
    const matchSearch = inv.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.id?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">Invoices</h1>
          <p className="text-sm text-gray-500">{invoices.length} total invoices</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: invoices.length, color: 'text-primary' },
          { label: 'Pending', value: invoices.filter(i => i.status === 'pending').length, color: 'text-alert' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl">
          {['all', 'pending', 'paid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-primary text-white' : 'text-gray-500 hover:text-navy'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No invoices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <div key={inv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display font-bold text-navy">
                    {inv.customers?.name || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    #{inv.id?.slice(0, 8)} · {inv.created_at ? format(new Date(inv.created_at), 'dd MMM yyyy') : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-display font-bold text-navy">
                    ₹{inv.total_amount?.toLocaleString('en-IN')}
                  </p>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {inv.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                  </span>
                </div>
              </div>
              {/* Items */}
              {inv.invoice_items?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                  {inv.invoice_items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.products?.name} × {item.quantity}</span>
                      <span className="font-medium text-navy">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => shareWhatsApp(inv)}
                  className="flex-1 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-xl hover:bg-green-100 transition-all flex items-center justify-center gap-1"
                >
                  💬 Share via WhatsApp
                </button>
                {inv.status === 'pending' && (
                  <button
                    onClick={() => handleMarkPaid(inv.id)}
                    className="flex-1 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-xl hover:bg-primary/20 transition-all flex items-center justify-center gap-1"
                  >
                    <Check size={14} /> Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl my-4">
            <h2 className="text-xl font-display font-bold text-navy mb-6">Create New Invoice</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Customer</label>
                <select
                  value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Due Date (optional)</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-navy">Items</label>
                  <button onClick={addItem} className="text-xs text-primary font-semibold hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={item.product_id}
                        onChange={e => updateItem(i, 'product_id', e.target.value)}
                        className="flex-2 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                      >
                        <option value="">Select product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value))}
                        className="w-16 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm text-center"
                      />
                      <span className="text-sm font-medium text-navy whitespace-nowrap">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-100">
                <span className="font-bold text-navy">Total</span>
                <span className="text-xl font-display font-bold text-primary">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
