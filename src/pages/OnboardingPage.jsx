// src/pages/OnboardingPage.jsx
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { upsertBusiness, addProduct, getBusiness, testConnection } from '../lib/supabase'
import toast from 'react-hot-toast'

const BUSINESS_TYPES = ['Retailer', 'Distributor', 'Manufacturer', 'Wholesaler', 'Service Provider']

const defaultProducts = [
  { name: '', price: '', stock: '', low_stock_threshold: 5 },
  { name: '', price: '', stock: '', low_stock_threshold: 5 },
  { name: '', price: '', stock: '', low_stock_threshold: 5 },
]

export default function OnboardingPage() {
  const { user, setBusiness, setOnboarded } = useAuth()
  const [step, setStep] = useState(1)
  const [bizName, setBizName] = useState('')
  const [bizType, setBizType] = useState('')
  const [products, setProducts] = useState(defaultProducts)
  const [loading, setLoading] = useState(false)

  const updateProduct = (i, field, value) => {
    const updated = [...products]
    updated[i][field] = value
    setProducts(updated)
  }

  const handleBizSubmit = async () => {
    if (!bizName.trim()) return toast.error('Please enter your business name')
    if (!bizType) return toast.error('Please select your business type')

    setLoading(true)

    // Test Supabase connection first
    const conn = await testConnection()
    if (!conn.ok) {
      setLoading(false)
      if (conn.error?.includes('fetch')) {
        toast.error(
          'Cannot reach database. Check your internet connection or Supabase may be paused.',
          { duration: 6000 }
        )
      } else {
        toast.error(`Database error: ${conn.error}`, { duration: 5000 })
      }
      return
    }

    const { data, error } = await upsertBusiness(user.uid, bizName.trim(), bizType)
    setLoading(false)

    if (error) {
      console.error('Business save error:', error)
      const msg = error.message?.includes('fetch')
        ? 'Network error. Check your internet and try again.'
        : error.message?.includes('violates')
        ? 'Database permission error. Contact support.'
        : `Failed to save: ${error.message}`
      toast.error(msg, { duration: 5000 })
      return
    }

    setBusiness(data)
    setStep(2)
  }

  const handleProductsSubmit = async (skip = false) => {
    if (!skip) {
      const { data: biz } = await getBusiness(user.uid)
      const bizId = biz?.id
      const validProducts = products.filter(p => p.name.trim() && p.price && p.stock)
      if (validProducts.length > 0 && bizId) {
        setLoading(true)
        for (const p of validProducts) {
          const { error } = await addProduct(bizId, {
            name: p.name.trim(),
            price: parseFloat(p.price),
            stock: parseInt(p.stock),
            low_stock_threshold: parseInt(p.low_stock_threshold) || 5,
          })
          if (error) console.error('Product add error:', error)
        }
        setLoading(false)
        toast.success('Products saved!')
      }
    }
    setStep(3)
  }

  const handleFinish = () => {
    setOnboarded(true)
    toast.success('Welcome to VyaparMitra!')
  }

  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen bg-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-navy">
            <span className="text-primary">Vyapar</span>
            <span className="text-success">Mitra</span>
          </h1>
          <p className="text-gray-500 mt-1">Setup your business in 3 easy steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {['Business Info', 'Add Products', 'WhatsApp Connect'].map((label, i) => (
              <div key={i} className={`flex items-center gap-1 text-xs font-medium ${
                step > i + 1 ? 'text-success' : step === i + 1 ? 'text-primary' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  step > i + 1 ? 'bg-success' : step === i + 1 ? 'bg-primary' : 'bg-gray-200'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">

          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-navy mb-1">Your Business</h2>
                <p className="text-gray-500 text-sm">Tell us about your business to get started</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Business Name</label>
                <input
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  placeholder="e.g., Ravi Hardware Store"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Business Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setBizType(type)}
                      className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                        bizType === type
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleBizSubmit}
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Step 2: Products */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-display font-bold text-navy mb-1">Add Your Products</h2>
                <p className="text-gray-500 text-sm">Add up to 3 products (you can add more later)</p>
              </div>
              {products.map((p, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase">Product {i + 1}</p>
                  <input
                    placeholder="Product name (e.g. Cement 50kg)"
                    value={p.name}
                    onChange={e => updateProduct(i, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                      <input
                        placeholder="Price"
                        type="number"
                        value={p.price}
                        onChange={e => updateProduct(i, 'price', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        placeholder="Stock qty"
                        type="number"
                        value={p.stock}
                        onChange={e => updateProduct(i, 'stock', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  onClick={() => handleProductsSubmit(true)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 transition-all"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => handleProductsSubmit(false)}
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save & Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: WhatsApp Connect */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">💬</span>
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-navy mb-2">You're all set!</h2>
                <p className="text-gray-500 text-sm">
                  Your business is ready. Use the WhatsApp Simulator to manage sales, payments and inventory.
                </p>
              </div>
              <div className="bg-green-50 rounded-2xl p-5 text-left space-y-3">
                <p className="font-semibold text-green-800 text-sm">Try these in the Simulator:</p>
                {[
                  '"Sold 5 cement to Ramesh for 2500"',
                  '"Ramesh paid 2000"',
                  '"How is my business?"',
                ].map((item, i) => (
                  <div key={i} className="flex gap-2 text-sm text-green-700">
                    <span>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-4 bg-success text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/30 text-lg"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
