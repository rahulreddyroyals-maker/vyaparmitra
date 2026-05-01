// src/pages/ProductsPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProducts, addProduct, updateProduct, deleteProduct } from '../lib/supabase'
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { name: '', price: '', stock: '', low_stock_threshold: 5 }

export default function ProductsPage() {
  const { business } = useAuth()
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!business) return
    setLoading(true)
    const { data } = await getProducts(business.id)
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [business])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, price: p.price, stock: p.stock, low_stock_threshold: p.low_stock_threshold }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.price) return toast.error('Name and price are required')
    setSaving(true)
    if (editing) {
      const { error } = await updateProduct(editing.id, { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) })
      if (error) toast.error('Failed to update product')
      else toast.success('Product updated!')
    } else {
      const { error } = await addProduct(business.id, { ...form, price: parseFloat(form.price), stock: parseInt(form.stock || 0) })
      if (error) toast.error('Failed to add product')
      else toast.success('Product added!')
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    const { error } = await deleteProduct(id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deleted!'); load() }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">Products</h1>
          <p className="text-sm text-gray-500">{products.length} products in your inventory</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
        />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Products', value: products.length, color: 'text-primary' },
          { label: 'Low Stock', value: products.filter(p => p.stock <= (p.low_stock_threshold || 5)).length, color: 'text-red-500' },
          { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Package size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No products found</p>
          <p className="text-sm text-gray-300">Add your first product to get started</p>
          <button onClick={openAdd} className="mt-4 px-6 py-2 bg-primary text-white text-sm font-semibold rounded-xl">Add Product</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Product</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Price</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Stock</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const isLow = p.stock <= (p.low_stock_threshold || 5)
                const isOut = p.stock === 0
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Package size={16} className="text-primary" />
                        </div>
                        <span className="font-medium text-navy">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-navy">
                      ₹{parseFloat(p.price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">{p.stock}</td>
                    <td className="px-6 py-4 text-right">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Out of Stock</span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                          <AlertTriangle size={10} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">In Stock</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-xl font-display font-bold text-navy mb-6">
              {editing ? 'Edit Product' : 'Add New Product'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Product Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Cement Bag 50kg"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="350"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1.5">Stock Qty</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    placeholder="100"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">Low Stock Alert At</label>
                <input
                  type="number"
                  value={form.low_stock_threshold}
                  onChange={e => setForm(f => ({ ...f, low_stock_threshold: parseInt(e.target.value) }))}
                  placeholder="5"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
