// src/pages/SimulatorPage.jsx
// Renamed to WhatsApp page - real product feel
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProducts, getCustomers, getInvoices, supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Send, MoreVertical, Phone, Video, Search } from 'lucide-react'

// ─── Intent Parser ─────────────────────────────────────────────────────────────
function parseIntent(text, products, customers) {
  const t = text.trim()
  const tl = t.toLowerCase()

  const salePatterns = [
    /sold?\s+(\d+)\s+(.+?)\s+to\s+(\w+)\s+for\s+(?:rs\.?|inr|rupees?|\u20b9)?\s*(\d+)/i,
    /(\d+)\s+(.+?)\s+(?:to\s+)?(\w+)\s+(?:for\s+)?(?:rs\.?|\u20b9)?\s*(\d+)/i,
    /becha\s+(\d+)\s+(.+?)\s+(\w+)\s+(?:ko\s+)?(?:rs\.?|\u20b9)?\s*(\d+)/i,
  ]
  for (const p of salePatterns) {
    const m = t.match(p)
    if (m) return { intent: 'SALE', qty: parseInt(m[1]), product: m[2].trim(), customer: m[3].trim(), amount: parseInt(m[4]) }
  }

  const payPatterns = [
    /(\w+)\s+(?:paid|diya|ne diya|payment)\s+(?:rs\.?|\u20b9)?\s*(\d+)/i,
    /received\s+(?:rs\.?|\u20b9)?\s*(\d+)\s+from\s+(\w+)/i,
  ]
  for (const p of payPatterns) {
    const m = t.match(p)
    if (m) {
      const isRecv = p.source.includes('received')
      return { intent: 'PAYMENT', customer: isRecv ? m[2].trim() : m[1].trim(), amount: parseInt(isRecv ? m[1] : m[2]) }
    }
  }

  if (/(?:stock|kitna|how much|left|remaining|bacha|inventory)/i.test(tl)) {
    const prodMatch = products.find(p => tl.includes(p.name.toLowerCase()))
    return { intent: 'STOCK_QUERY', product: prodMatch?.name || null }
  }

  if (/(?:history|due|baaki|kitna dena|details|info|orders)/i.test(tl)) {
    const custMatch = customers.find(c => tl.includes(c.name.toLowerCase()))
    return { intent: 'CUSTOMER_QUERY', customer: custMatch?.name || null }
  }

  if (/(?:business|how is|report|sales|aaj|today|summary|kaisa|chal raha)/i.test(tl)) {
    return { intent: 'BUSINESS_INSIGHTS' }
  }

  if (/(?:pending|invoice|bill|unpaid|dues|baaki list)/i.test(tl)) {
    return { intent: 'INVOICE_LIST' }
  }

  if (/(?:low stock|khatam|running low|order karna|reorder)/i.test(tl)) {
    return { intent: 'LOW_STOCK' }
  }

  return { intent: 'UNKNOWN' }
}

// ─── Reply Builders ────────────────────────────────────────────────────────────
function buildSaleReply(parsed, invoiceNo, isNewCustomer, lowStockWarning) {
  let r = `Sale recorded!\n\n`
  r += `${parsed.qty}x ${parsed.product}\n`
  r += `Customer: ${parsed.customer}\n`
  r += `Amount: \u20B9${parsed.amount.toLocaleString('en-IN')}\n`
  r += `Invoice: #${invoiceNo}\n`
  r += `Status: Pending`
  if (isNewCustomer) r += `\n\nNew customer "${parsed.customer}" added.`
  if (lowStockWarning !== null) r += `\n\nWarning: ${parsed.product} stock is low (${lowStockWarning} left). Consider reordering.`
  return r
}

function buildPaymentReply(customerName, amount, remaining) {
  let r = `Payment recorded!\n\n`
  r += `Customer: ${customerName}\n`
  r += `Amount received: \u20B9${amount.toLocaleString('en-IN')}\n`
  r += remaining > 0
    ? `Balance due: \u20B9${remaining.toLocaleString('en-IN')}`
    : `All dues cleared!`
  return r
}

function buildStockReply(products, productName) {
  if (productName) {
    const p = products.find(pr => pr.name.toLowerCase().includes(productName.toLowerCase()))
    if (!p) return `Product "${productName}" not found.\n\nType "stock" to see all products.`
    const isLow = p.stock <= (p.low_stock_threshold || 5)
    return `${p.name}\n\nStock: ${p.stock} units${isLow ? ' (LOW)' : ''}\nPrice: \u20B9${p.price}/unit\nAlert at: ${p.low_stock_threshold || 5} units`
  }
  if (!products.length) return `No products added yet.\n\nGo to Products to add your inventory.`
  let r = `Stock Summary\n\n`
  products.forEach(p => {
    const isLow = p.stock <= (p.low_stock_threshold || 5)
    r += `${p.name}: ${p.stock} units${isLow ? ' - LOW' : ''}\n`
  })
  return r.trim()
}

function buildCustomerReply(customer, invoices) {
  if (!customer) return `Customer not found. Check the name and try again.`
  const custInvoices = invoices.filter(i => i.customer_id === customer.id)
  const total = custInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const pending = custInvoices.filter(i => i.status === 'pending').length
  let r = `${customer.name}\n\n`
  r += `Total orders: ${custInvoices.length}\n`
  r += `Total business: \u20B9${total.toLocaleString('en-IN')}\n`
  r += `Due amount: \u20B9${(customer.total_due || 0).toLocaleString('en-IN')}\n`
  r += `Pending invoices: ${pending}`
  if (customer.last_order_date) r += `\nLast order: ${format(new Date(customer.last_order_date), 'dd MMM yyyy')}`
  return r
}

function buildInsightsReply(invoices, bizName) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const todaySales = invoices.filter(i => i.created_at?.startsWith(today)).reduce((s, i) => s + (i.total_amount || 0), 0)
  const yestSales = invoices.filter(i => i.created_at?.startsWith(yesterday)).reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalDue = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || 0), 0)
  const pendingCount = invoices.filter(i => i.status === 'pending').length
  const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  let r = `${bizName} - Business Report\n\n`
  r += `Today's sales: \u20B9${todaySales.toLocaleString('en-IN')}\n`
  if (yestSales > 0) {
    const change = Math.round(((todaySales - yestSales) / yestSales) * 100)
    r += `vs yesterday: ${change >= 0 ? '+' : ''}${change}%\n`
  }
  r += `\nPending payments: \u20B9${totalDue.toLocaleString('en-IN')}\n`
  r += `Pending invoices: ${pendingCount}\n`
  r += `Total revenue: \u20B9${totalRevenue.toLocaleString('en-IN')}`
  return r
}

function buildInvoiceListReply(invoices, customers) {
  const pending = invoices.filter(i => i.status === 'pending').slice(0, 8)
  if (!pending.length) return `No pending invoices!\n\nAll payments are clear.`
  const total = pending.reduce((s, i) => s + (i.total_amount || 0), 0)
  let r = `Pending Invoices (${pending.length})\n\n`
  pending.forEach(inv => {
    const cust = customers.find(c => c.id === inv.customer_id)
    r += `${cust?.name || 'Unknown'}: \u20B9${inv.total_amount?.toLocaleString('en-IN')}\n`
  })
  r += `\nTotal pending: \u20B9${total.toLocaleString('en-IN')}`
  return r
}

function buildLowStockReply(products) {
  const low = products.filter(p => p.stock <= (p.low_stock_threshold || 5))
  if (!low.length) return `All products are well stocked.\n\nNo reorders needed right now.`
  let r = `Low Stock Alert\n\n`
  low.forEach(p => { r += `${p.name}: only ${p.stock} left (alert at ${p.low_stock_threshold || 5})\n` })
  r += `\nConsider reordering these soon.`
  return r
}

const QUICK_MSGS = [
  { label: 'Record Sale', text: 'Sold 5 cement to Ramesh for 2500', color: '#E3F2FD', textColor: '#1565C0' },
  { label: 'Payment In', text: 'Ramesh paid 2000', color: '#E8F5E9', textColor: '#2E7D32' },
  { label: 'Check Stock', text: 'How much cement left?', color: '#FFF3E0', textColor: '#E65100' },
  { label: 'Customer Info', text: 'Ramesh history', color: '#F3E5F5', textColor: '#6A1B9A' },
  { label: 'Business Report', text: 'How is my business today?', color: '#E0F2F1', textColor: '#00695C' },
  { label: 'Pending Dues', text: 'Show pending invoices', color: '#FCE4EC', textColor: '#880E4F' },
]

export default function SimulatorPage() {
  const { business } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const chatRef = useRef(null)

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
    addBotMsg(`Welcome to ${business?.name || 'your business'} on VyaparMitra!\n\nType any business message below.\n\nExample: "Sold 5 cement to Ramesh for 2500"`)
  }, [business])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const addMsg = (text, type) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, type, time: new Date() }])
  }
  const addUserMsg = (text) => addMsg(text, 'user')
  const addBotMsg = (text) => addMsg(text, 'bot')

  const processMessage = async (text) => {
    if (!text.trim() || !business) return
    setLoading(true)
    addUserMsg(text)

    // Show typing indicator
    const typingId = Date.now()
    setMessages(prev => [...prev, { id: typingId, type: 'typing', time: new Date() }])

    await new Promise(r => setTimeout(r, 800))
    setMessages(prev => prev.filter(m => m.id !== typingId))

    const parsed = parseIntent(text, products, customers)
    let reply = ''

    try {
      if (parsed.intent === 'SALE') {
        let cust = customers.find(c => c.name.toLowerCase().includes(parsed.customer.toLowerCase()))
        let isNewCustomer = false
        if (!cust) {
          const { data: newCust } = await supabase.from('customers').insert({
            business_id: business.id, name: parsed.customer, phone: '', total_due: 0
          }).select().single()
          cust = newCust
          isNewCustomer = true
        }

        const { data: invoice } = await supabase.from('invoices').insert({
          business_id: business.id, customer_id: cust?.id,
          total_amount: parsed.amount, status: 'pending'
        }).select().single()

        let lowStockWarning = null
        const prod = products.find(p => p.name.toLowerCase().includes(parsed.product.toLowerCase()))
        if (prod && invoice) {
          await supabase.from('invoice_items').insert({
            invoice_id: invoice.id, product_id: prod.id, quantity: parsed.qty, price: prod.price
          })
          const newStock = Math.max(0, prod.stock - parsed.qty)
          await supabase.from('products').update({ stock: newStock }).eq('id', prod.id)
          if (newStock <= (prod.low_stock_threshold || 5)) lowStockWarning = newStock
        }

        if (cust) {
          await supabase.from('customers').update({
            total_due: (cust.total_due || 0) + parsed.amount,
            last_order_date: new Date().toISOString()
          }).eq('id', cust.id)
        }

        const invoiceNo = invoice?.id?.slice(0, 8).toUpperCase() || 'NEW001'
        reply = buildSaleReply(parsed, invoiceNo, isNewCustomer, lowStockWarning)

      } else if (parsed.intent === 'PAYMENT') {
        const freshCustomers = (await getCustomers(business.id)).data || []
        const cust = freshCustomers.find(c => c.name.toLowerCase().includes(parsed.customer.toLowerCase()))
        if (!cust) {
          reply = `Customer "${parsed.customer}" not found.\n\nKnown customers: ${freshCustomers.map(c => c.name).join(', ') || 'none yet'}`
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
        reply = `I didn't understand that.\n\nHere's what you can say:\n\nRecord a sale:\n"Sold 5 cement to Ramesh for 2500"\n\nRecord payment:\n"Ramesh paid 2000"\n\nBusiness report:\n"How is my business?"\n\nCheck dues:\n"Show pending invoices"\n\nCheck stock:\n"How much cement left?"\n\nCustomer info:\n"Ramesh history"`
      }

      // Log to whatsapp_logs
      await supabase.from('whatsapp_logs').insert({
        user_id: business.user_id, message: text,
        intent: parsed.intent, response: reply
      }).select().catch(() => {})

    } catch (err) {
      console.error('Message error:', err)
      reply = `Something went wrong. Please try again.`
    }

    addBotMsg(reply)
    await loadData()
    setLoading(false)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await processMessage(text)
  }

  const initial = (business?.name || 'V')[0].toUpperCase()

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>

      {/* WhatsApp-style header */}
      <div style={{ background: '#075E54' }} className="px-3 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700 text-sm flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{business?.name}</p>
          <p className="text-green-200 text-xs">VyaparMitra Bot</p>
        </div>
        <div className="flex items-center gap-4">
          <Phone size={18} className="text-white opacity-80" />
          <Search size={18} className="text-white opacity-80" />
          <MoreVertical size={18} className="text-white opacity-80" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
        style={{ background: '#ECE5DD' }}
      >
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-1`}>
            {msg.type === 'typing' ? (
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
                  msg.type === 'user'
                    ? 'rounded-tr-none'
                    : 'rounded-tl-none bg-white'
                }`}
                style={msg.type === 'user' ? { background: '#D9FDD3' } : {}}
              >
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </p>
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {format(msg.time, 'hh:mm a')}
                  {msg.type === 'user' && (
                    <span className="ml-1 text-blue-500">✓✓</span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick action chips */}
      <div
        className="px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0"
        style={{ background: '#F0F2F5', scrollbarWidth: 'none' }}
      >
        {QUICK_MSGS.map(q => (
          <button
            key={q.label}
            onClick={() => !loading && processMessage(q.text)}
            disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50 transition-all active:scale-95"
            style={{ background: q.color, color: q.textColor, border: `1px solid ${q.textColor}30` }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div
        className="px-3 pb-3 pt-2 flex items-center gap-2 flex-shrink-0"
        style={{ background: '#F0F2F5' }}
      >
        <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2.5 shadow-sm">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder='Message'
            className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
          style={{ background: '#25D366' }}
        >
          <Send size={18} className="text-white" style={{ marginLeft: 2 }} />
        </button>
      </div>
    </div>
  )
}
