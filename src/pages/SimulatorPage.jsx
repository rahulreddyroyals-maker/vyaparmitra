// src/pages/SimulatorPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getProducts, getCustomers, getInvoices,
  addProduct, addCustomer, addInvoice, markInvoicePaid,
  updateCustomer, updateProduct
} from '../lib/supabase'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// ─── Intent Parser (runs in browser, no backend needed) ───────────────────────
function parseIntent(text, products, customers) {
  const t = text.trim()
  const tl = t.toLowerCase()

  // SALE: "sold 5 cement to Ramesh for 2500" or "5 cement Ramesh 2500"
  const salePatterns = [
    /sold\s+(\d+)\s+(.+?)\s+to\s+(\w+)\s+for\s+(?:rs\.?|₹)?\s*(\d+)/i,
    /(\d+)\s+(.+?)\s+(?:to\s+)?(\w+)\s+(?:for\s+)?(?:rs\.?|₹)?\s*(\d+)/i,
    /becha\s+(\d+)\s+(.+?)\s+(\w+)\s+(?:ko\s+)?(?:rs\.?|₹)?\s*(\d+)/i,
  ]
  for (const p of salePatterns) {
    const m = t.match(p)
    if (m) return { intent: 'SALE', qty: parseInt(m[1]), product: m[2].trim(), customer: m[3].trim(), amount: parseInt(m[4]) }
  }

  // PAYMENT: "Ramesh paid 2000" or "received 2000 from Ramesh"
  const payPatterns = [
    /(\w+)\s+(?:paid|diya|ne diya)\s+(?:rs\.?|₹)?\s*(\d+)/i,
    /received\s+(?:rs\.?|₹)?\s*(\d+)\s+from\s+(\w+)/i,
    /(\d+)\s+(?:received\s+)?from\s+(\w+)/i,
  ]
  for (const p of payPatterns) {
    const m = t.match(p)
    if (m) {
      const isRecv = p.source.includes('received') && !p.source.startsWith('(')
      return {
        intent: 'PAYMENT',
        customer: isRecv ? m[2].trim() : m[1].trim(),
        amount: parseInt(isRecv ? m[1] : m[2])
      }
    }
  }

  // STOCK QUERY
  if (/(?:stock|kitna|how much|left|remaining|bacha)/i.test(tl)) {
    const prodMatch = products.find(p => tl.includes(p.name.toLowerCase()))
    return { intent: 'STOCK_QUERY', product: prodMatch?.name || null }
  }

  // CUSTOMER QUERY
  if (/(?:history|due|baaki|kitna dena|details|info)/i.test(tl)) {
    const custMatch = customers.find(c => tl.includes(c.name.toLowerCase()))
    return { intent: 'CUSTOMER_QUERY', customer: custMatch?.name || null }
  }

  // INSIGHTS
  if (/(?:business|how is|report|sales|aaj|today|summary)/i.test(tl)) {
    return { intent: 'BUSINESS_INSIGHTS' }
  }

  // INVOICE LIST
  if (/(?:pending|invoice|bill|unpaid|dues)/i.test(tl)) {
    return { intent: 'INVOICE_LIST' }
  }

  // LOW STOCK
  if (/(?:low stock|khatam|running low|order)/i.test(tl)) {
    return { intent: 'LOW_STOCK' }
  }

  return { intent: 'UNKNOWN' }
}

// ─── Response Generators ──────────────────────────────────────────────────────
function buildSaleReply(parsed, invoiceNo, isNewCustomer, lowStockWarning) {
  let r = `✅ *Sale recorded successfully!*\n\n`
  r += `📦 ${parsed.qty}x ${parsed.product}\n`
  r += `👤 Customer: ${parsed.customer}\n`
  r += `💰 Amount: ₹${parsed.amount.toLocaleString('en-IN')}\n`
  r += `📄 Invoice: #${invoiceNo}\n`
  r += `⏳ Payment: Pending\n`
  if (isNewCustomer) r += `\n🆕 New customer "${parsed.customer}" added automatically!`
  if (lowStockWarning) r += `\n\n⚠️ *Low stock alert!* Only ${lowStockWarning} units of ${parsed.product} remaining.`
  return r
}

function buildPaymentReply(customerName, amount, remaining) {
  let r = `✅ *Payment recorded!*\n\n`
  r += `👤 Customer: ${customerName}\n`
  r += `💵 Paid: ₹${amount.toLocaleString('en-IN')}\n`
  r += remaining > 0
    ? `💳 Still due: ₹${remaining.toLocaleString('en-IN')}`
    : `🎉 All dues cleared! Great!`
  return r
}

function buildStockReply(products, productName) {
  if (productName) {
    const p = products.find(pr => pr.name.toLowerCase().includes(productName.toLowerCase()))
    if (!p) return `❌ Product "${productName}" not found.\n\nType "stock" to see all products.`
    const isLow = p.stock <= (p.low_stock_threshold || 5)
    return `📦 *${p.name}*\n\nStock: ${p.stock} units ${isLow ? '⚠️ LOW' : '✅ OK'}\nPrice: ₹${p.price}/unit\nAlert at: ${p.low_stock_threshold || 5} units`
  }
  if (!products.length) return `📦 No products added yet.\n\nGo to Products page to add your inventory.`
  let r = `📦 *Stock Summary*\n\n`
  products.forEach(p => {
    const isLow = p.stock <= (p.low_stock_threshold || 5)
    r += `${isLow ? '⚠️' : '✅'} ${p.name}: ${p.stock} units @ ₹${p.price}\n`
  })
  return r
}

function buildCustomerReply(customer, invoices) {
  if (!customer) return `❌ Customer not found. Check the name and try again.`
  const custInvoices = invoices.filter(i => i.customer_id === customer.id)
  const total = custInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const pending = custInvoices.filter(i => i.status === 'pending').length
  let r = `👤 *${customer.name}*\n\n`
  r += `📋 Total orders: ${custInvoices.length}\n`
  r += `💰 Total business: ₹${total.toLocaleString('en-IN')}\n`
  r += `💳 Due amount: ₹${(customer.total_due || 0).toLocaleString('en-IN')}\n`
  r += `⏳ Pending invoices: ${pending}`
  if (customer.last_order_date) r += `\n📅 Last order: ${format(new Date(customer.last_order_date), 'dd MMM yyyy')}`
  return r
}

function buildInsightsReply(invoices, bizName) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const todaySales = invoices.filter(i => i.created_at?.startsWith(today)).reduce((s, i) => s + (i.total_amount || 0), 0)
  const yestSales = invoices.filter(i => i.created_at?.startsWith(yesterday)).reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalDue = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || 0), 0)
  const pendingCount = invoices.filter(i => i.status === 'pending').length
  const trend = yestSales > 0
    ? todaySales >= yestSales ? `📈 Up ${Math.round(((todaySales - yestSales) / yestSales) * 100)}% vs yesterday`
    : `📉 Down ${Math.round(((yestSales - todaySales) / yestSales) * 100)}% vs yesterday`
    : `📊 New data today`
  let r = `📊 *${bizName} — Business Report*\n\n`
  r += `💰 Today's sales: ₹${todaySales.toLocaleString('en-IN')}\n`
  r += `${trend}\n\n`
  r += `💳 Pending payments: ₹${totalDue.toLocaleString('en-IN')}\n`
  r += `📄 Pending invoices: ${pendingCount}\n`
  r += `📦 Total products: ${invoices.length} transactions`
  return r
}

function buildInvoiceListReply(invoices, customers) {
  const pending = invoices.filter(i => i.status === 'pending').slice(0, 5)
  if (!pending.length) return `✅ No pending invoices!\n\nAll payments are clear. Great work!`
  const total = pending.reduce((s, i) => s + (i.total_amount || 0), 0)
  let r = `⏳ *Pending Invoices (${pending.length})*\n\n`
  pending.forEach(inv => {
    const cust = customers.find(c => c.id === inv.customer_id)
    r += `• ${cust?.name || 'Unknown'}: ₹${inv.total_amount?.toLocaleString('en-IN')}\n`
  })
  r += `\n💰 Total pending: ₹${total.toLocaleString('en-IN')}`
  return r
}

function buildLowStockReply(products) {
  const low = products.filter(p => p.stock <= (p.low_stock_threshold || 5))
  if (!low.length) return `✅ All products are well stocked!\n\nNo reorders needed right now.`
  let r = `⚠️ *Low Stock Alert!*\n\n`
  low.forEach(p => { r += `• ${p.name}: only ${p.stock} left (alert: ${p.low_stock_threshold || 5})\n` })
  r += `\nConsider reordering these items soon.`
  return r
}

// ─── Preset demo messages ─────────────────────────────────────────────────────
const QUICK_MSGS = [
  { label: 'Record Sale', text: 'Sold 5 cement to Ramesh for 2500', color: 'bg-blue-100 text-blue-800' },
  { label: 'Payment In', text: 'Ramesh paid 2000', color: 'bg-green-100 text-green-800' },
  { label: 'Check Stock', text: 'How much cement left?', color: 'bg-orange-100 text-orange-800' },
  { label: 'Customer Info', text: 'Ramesh history', color: 'bg-purple-100 text-purple-800' },
  { label: 'Business Report', text: 'How is my business today?', color: 'bg-teal-100 text-teal-800' },
  { label: 'Pending Dues', text: 'Show pending invoices', color: 'bg-red-100 text-red-800' },
]

const DEMO_SCRIPT = [
  'Sold 5 cement to Ramesh for 2500',
  'Sold 10 steel rods to Kumar for 4500',
  'Ramesh paid 2000',
  'How is my business today?',
  'Show pending invoices',
  'Ramesh history',
]

export default function SimulatorPage() {
  const { business } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [demoIdx, setDemoIdx] = useState(0)
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [liveEvent, setLiveEvent] = useState(null)
  const chatRef = useRef(null)
  const demoTimer = useRef(null)

  const loadData = async () => {
    if (!business) return
    const [p, c, i] = await Promise.all([
      getProducts(business.id),
      getCustomers(business.id),
      getInvoices(business.id),
    ])
    setProducts(p.data || [])
    setCustomers(c.data || [])
    setInvoices(i.data || [])
  }

  useEffect(() => {
    loadData()
    addBotMsg(`👋 Welcome to VyaparMitra WhatsApp Simulator!\n\nType any business message or use the quick buttons below.\n\nExample: *"Sold 5 cement to Ramesh for 2500"*`)
  }, [business])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const addMsg = (text, type, meta = null) => {
    const msg = { id: Date.now() + Math.random(), text, type, time: new Date(), meta }
    setMessages(prev => [...prev, msg])
    return msg
  }

  const addUserMsg = (text) => addMsg(text, 'user')
  const addBotMsg = (text, meta = null) => addMsg(text, 'bot', meta)
  const addTyping = () => addMsg('...', 'typing')

  const removeTyping = () => setMessages(prev => prev.filter(m => m.type !== 'typing'))

  const processMessage = async (text) => {
    if (!text.trim() || !business) return
    setLoading(true)
    addUserMsg(text)

    setTimeout(() => addMsg('typing...', 'typing'), 200)

    await new Promise(r => setTimeout(r, 900))
    removeTyping()

    const parsed = parseIntent(text, products, customers)
    let reply = ''
    let eventLabel = null

    try {
      if (parsed.intent === 'SALE') {
        // Find or fuzzy-match product
        let prod = products.find(p => p.name.toLowerCase().includes(parsed.product.toLowerCase()))
        // Find or create customer
        let cust = customers.find(c => c.name.toLowerCase().includes(parsed.customer.toLowerCase()))
        let isNewCustomer = false
        if (!cust) {
          const { data: newCust } = await supabase.from('customers').insert({
            business_id: business.id, name: parsed.customer, phone: '', total_due: 0
          }).select().single()
          cust = newCust
          isNewCustomer = true
        }
        // Create invoice
        const { data: invoice } = await supabase.from('invoices').insert({
          business_id: business.id,
          customer_id: cust?.id,
          total_amount: parsed.amount,
          status: 'pending'
        }).select().single()

        // Add item & update stock
        let lowStockWarning = null
        if (prod && invoice) {
          await supabase.from('invoice_items').insert({
            invoice_id: invoice.id, product_id: prod.id,
            quantity: parsed.qty, price: prod.price
          })
          const newStock = Math.max(0, prod.stock - parsed.qty)
          await supabase.from('products').update({ stock: newStock }).eq('id', prod.id)
          if (newStock <= (prod.low_stock_threshold || 5)) lowStockWarning = newStock
        }
        // Update customer due
        if (cust) {
          await supabase.from('customers').update({
            total_due: (cust.total_due || 0) + parsed.amount,
            last_order_date: new Date().toISOString()
          }).eq('id', cust.id)
        }
        const invoiceNo = invoice?.id?.slice(0, 8).toUpperCase() || 'NEW001'
        reply = buildSaleReply(parsed, invoiceNo, isNewCustomer, lowStockWarning)
        eventLabel = `✅ Invoice created · ₹${parsed.amount.toLocaleString('en-IN')} pending from ${parsed.customer}`

      } else if (parsed.intent === 'PAYMENT') {
        const freshCustomers = (await getCustomers(business.id)).data || []
        const cust = freshCustomers.find(c => c.name.toLowerCase().includes(parsed.customer.toLowerCase()))
        if (!cust) {
          reply = `❌ Customer "${parsed.customer}" not found.\n\nKnown customers: ${freshCustomers.map(c => c.name).join(', ') || 'none yet'}`
        } else {
          const { data: pendingInv } = await supabase.from('invoices').select('*')
            .eq('customer_id', cust.id).eq('status', 'pending')
            .order('created_at', { ascending: true }).limit(1).maybeSingle()
          if (pendingInv && parsed.amount >= pendingInv.total_amount) {
            await supabase.from('invoices').update({ status: 'paid' }).eq('id', pendingInv.id)
            await supabase.from('payments').insert({
              invoice_id: pendingInv.id, amount: parsed.amount,
              method: 'cash', payment_date: new Date().toISOString()
            })
          }
          const newDue = Math.max(0, (cust.total_due || 0) - parsed.amount)
          await supabase.from('customers').update({ total_due: newDue }).eq('id', cust.id)
          reply = buildPaymentReply(cust.name, parsed.amount, newDue)
          eventLabel = `💰 ₹${parsed.amount.toLocaleString('en-IN')} received from ${cust.name}`
        }

      } else if (parsed.intent === 'STOCK_QUERY') {
        const freshProds = (await getProducts(business.id)).data || []
        reply = buildStockReply(freshProds, parsed.product)

      } else if (parsed.intent === 'CUSTOMER_QUERY') {
        const freshCusts = (await getCustomers(business.id)).data || []
        const freshInvs = (await getInvoices(business.id)).data || []
        const cust = freshCusts.find(c => c.name.toLowerCase().includes((parsed.customer || '').toLowerCase()))
        reply = buildCustomerReply(cust, freshInvs)

      } else if (parsed.intent === 'BUSINESS_INSIGHTS') {
        const freshInvs = (await getInvoices(business.id)).data || []
        reply = buildInsightsReply(freshInvs, business.name)

      } else if (parsed.intent === 'INVOICE_LIST') {
        const freshInvs = (await getInvoices(business.id)).data || []
        const freshCusts = (await getCustomers(business.id)).data || []
        reply = buildInvoiceListReply(freshInvs, freshCusts)

      } else if (parsed.intent === 'LOW_STOCK') {
        const freshProds = (await getProducts(business.id)).data || []
        reply = buildLowStockReply(freshProds)

      } else {
        reply = `🤔 Didn't understand that.\n\nHere's what you can say:\n\n📦 *Record sale:*\n"Sold 5 cement to Ramesh for 2500"\n\n💰 *Record payment:*\n"Ramesh paid 2000"\n\n📊 *Business report:*\n"How is my business?"\n\n📋 *Check dues:*\n"Show pending invoices"\n\n📦 *Check stock:*\n"How much cement left?"\n\n👤 *Customer info:*\n"Ramesh history"`
      }

      await supabase.from('whatsapp_logs').insert({
        user_id: business.user_id, message: text,
        intent: parsed.intent, response: reply
      }).select()

    } catch (err) {
      console.error('Simulator error:', err)
      reply = `⚠️ Something went wrong. Please try again.`
    }

    addBotMsg(reply)
    if (eventLabel) {
      setLiveEvent(eventLabel)
      setTimeout(() => setLiveEvent(null), 4000)
    }
    await loadData()
    setLoading(false)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await processMessage(text)
  }

  const handleQuick = async (text) => {
    if (loading) return
    await processMessage(text)
  }

  const runDemo = async () => {
    if (isDemoRunning) {
      clearTimeout(demoTimer.current)
      setIsDemoRunning(false)
      setDemoIdx(0)
      return
    }
    setIsDemoRunning(true)
    setDemoIdx(0)
    const runNext = async (idx) => {
      if (idx >= DEMO_SCRIPT.length) { setIsDemoRunning(false); setDemoIdx(0); return }
      setDemoIdx(idx)
      await processMessage(DEMO_SCRIPT[idx])
      demoTimer.current = setTimeout(() => runNext(idx + 1), 2200)
    }
    runNext(0)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <span className="text-2xl">💬</span> WhatsApp Simulator
          </h1>
          <p className="text-sm text-gray-500">Live demo — messages update real Supabase data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runDemo}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
              isDemoRunning
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-success text-white hover:bg-green-700'
            }`}
          >
            {isDemoRunning ? '⏹ Stop Demo' : '▶ Run Auto Demo'}
          </button>
        </div>
      </div>

      {/* Live event toast */}
      {liveEvent && (
        <div className="bg-success/10 border border-success/30 text-success rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 bg-success rounded-full"></span>
          {liveEvent} — <span className="font-normal text-green-700">Supabase updated live</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ height: '600px' }}>
          {/* WA Header */}
          <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{(business?.name || 'VM')[0]}</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{business?.name || 'My Business'}</p>
              <p className="text-green-200 text-xs">VyaparMitra Bot • Online</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-200 text-xs">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#ECE5DD' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'typing' ? (
                  <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.type === 'user'
                      ? 'bg-[#DCF8C6] rounded-tr-none'
                      : 'bg-white rounded-tl-none'
                  }`}>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: msg.text
                          .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {format(msg.time, 'hh:mm a')}
                      {msg.type === 'user' && ' ✓✓'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick buttons */}
          <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto" style={{ background: '#F0F0F0' }}>
            {QUICK_MSGS.map(q => (
              <button
                key={q.label}
                onClick={() => handleQuick(q.text)}
                disabled={loading}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${q.color} disabled:opacity-50 transition-all hover:opacity-80 mb-2`}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3" style={{ background: '#F0F0F0' }}>
            <div className="flex gap-2 items-center bg-white rounded-full px-4 py-2 shadow-sm">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder='Type a message... e.g. "Sold 5 cement to Ramesh for 2500"'
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center disabled:opacity-40 transition-all hover:bg-[#128C7E]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Live Stats Panel */}
        <div className="space-y-3">
          {/* Live indicator */}
          <div className="bg-navy rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Live Supabase Data</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-blue-300 mb-0.5">Today's Revenue</p>
                <p className="text-2xl font-display font-bold text-white">
                  ₹{invoices.filter(i => i.created_at?.startsWith(new Date().toISOString().split('T')[0])).reduce((s,i) => s+(i.total_amount||0),0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-300 mb-0.5">Pending Payments</p>
                <p className="text-xl font-display font-bold text-alert">
                  ₹{invoices.filter(i=>i.status==='pending').reduce((s,i)=>s+(i.total_amount||0),0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Products', value: products.length },
                  { label: 'Customers', value: customers.length },
                  { label: 'Invoices', value: invoices.length },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-xs text-blue-300">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Inventory</p>
            {products.length === 0 ? (
              <p className="text-xs text-gray-400">No products yet. Add via "Add Product" page.</p>
            ) : products.slice(0,4).map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-navy truncate max-w-[100px]">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{p.stock} left</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.stock <= (p.low_stock_threshold||5) ? 'bg-red-400' : 'bg-success'}`}></span>
                </div>
              </div>
            ))}
          </div>

          {/* Customers with dues */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Customer Dues</p>
            {customers.filter(c => (c.total_due||0) > 0).length === 0 ? (
              <p className="text-xs text-gray-400">All dues cleared! ✓</p>
            ) : customers.filter(c=>(c.total_due||0)>0).slice(0,4).map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-navy">{c.name}</span>
                <span className="text-xs font-bold text-red-500">₹{c.total_due?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {/* Demo script */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-2">▶ Auto Demo Script</p>
            {DEMO_SCRIPT.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 py-1 text-xs ${
                isDemoRunning && demoIdx === i ? 'text-amber-900 font-semibold' : 'text-amber-700'
              }`}>
                <span>{isDemoRunning && demoIdx === i ? '▶' : `${i+1}.`}</span>
                <span className="truncate">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-bold text-navy mb-3">How to use this for client demos</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { step: '1', text: 'Click "▶ Run Auto Demo" to show the full flow automatically' },
            { step: '2', text: 'Watch stats on the right update live as each message is processed' },
            { step: '3', text: 'Open Dashboard in another tab — it updates in real time too' },
            { step: '4', text: 'Type custom messages to demo your specific product/customer names' },
          ].map(s => (
            <div key={s.step} className="flex gap-2">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary text-xs font-bold">{s.step}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
