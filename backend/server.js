// backend/server.js
// VyaparMitra WhatsApp Webhook Backend
// Deploy to Railway (free) when you have a paid client
// 
// Setup:
// 1. cd backend && npm install
// 2. cp .env.example .env (fill in values)
// 3. node server.js (local test)
// 4. railway up (deploy to Railway free tier)
// 5. Set webhook URL in WATI: https://your-app.railway.app/webhook

import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WATI_TOKEN = process.env.WATI_API_TOKEN
const WA_VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'vyaparmitra2024'

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'VyaparMitra Webhook Active',
    mode: WATI_TOKEN ? 'LIVE' : 'TEST',
    time: new Date().toISOString()
  })
})

// ─── WhatsApp webhook verification ────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query
  if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
    console.log('Webhook verified')
    return res.status(200).send(challenge)
  }
  res.sendStatus(403)
})

// ─── Incoming WhatsApp messages ────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200) // Always respond 200 immediately

  try {
    const msg = parseMessage(req.body)
    if (!msg?.text || !msg?.phone) return

    console.log(`MSG from ${msg.phone}: "${msg.text}"`)

    // Find business by phone number
    const phone = `+91${msg.phone.replace(/\D/g, '').slice(-10)}`
    const { data: user } = await supabase
      .from('users')
      .select('id, businesses(*)')
      .eq('phone', phone)
      .maybeSingle()

    if (!user?.businesses) {
      await sendWA(msg.phone,
        `Hi! You're not registered on VyaparMitra.\n\nVisit https://vyaparmitra.netlify.app to set up your account. Takes 2 minutes!`)
      return
    }

    const business = user.businesses
    const reply = await processMessage(msg.text, business.id, business.name, user.id)
    await sendWA(msg.phone, reply)

  } catch (err) {
    console.error('Webhook error:', err)
  }
})

// ─── Intent detection (simple rule-based, no AI cost) ─────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase().trim()

  const saleMatch = text.match(/sold?\s+(\d+)\s+(.+?)\s+to\s+(\w+)\s+for\s+(?:rs\.?|inr|₹)?\s*(\d+)/i)
  if (saleMatch) return { type: 'SALE', qty: parseInt(saleMatch[1]), product: saleMatch[2].trim(), customer: saleMatch[3], amount: parseInt(saleMatch[4]) }

  const payMatch = text.match(/(\w+)\s+(?:paid|ne diya|payment)\s+(?:rs\.?|₹)?\s*(\d+)/i)
  if (payMatch) return { type: 'PAYMENT', customer: payMatch[1], amount: parseInt(payMatch[2]) }

  if (/how.*business|aaj.*sales|today.*sales|report|summary/i.test(t)) return { type: 'INSIGHTS' }
  if (/stock|kitna.*bacha|how much.*left|inventory/i.test(t)) return { type: 'STOCK' }
  if (/pending|dues|baaki|outstanding|invoices/i.test(t)) return { type: 'PENDING' }
  if (/(\w+)\s+history|orders|(\w+).*details/i.test(t)) {
    const m = text.match(/(\w+)\s+(?:history|orders)/i)
    return { type: 'CUSTOMER', name: m?.[1] }
  }
  return { type: 'UNKNOWN' }
}

// ─── Process message and return reply ─────────────────────────────────────────
async function processMessage(text, businessId, bizName, userId) {
  const intent = detectIntent(text)
  console.log('Intent:', intent)

  await supabase.from('whatsapp_logs').insert({
    user_id: userId, message: text, intent: intent.type, response: null
  })

  switch (intent.type) {

    case 'SALE': {
      const { product, qty, customer, amount } = intent

      // Find or create customer
      let { data: cust } = await supabase.from('customers')
        .select('*').eq('business_id', businessId).ilike('name', `%${customer}%`).maybeSingle()

      let isNew = false
      if (!cust) {
        const { data: newCust } = await supabase.from('customers')
          .insert({ business_id: businessId, name: customer, phone: '', total_due: 0 })
          .select().single()
        cust = newCust
        isNew = true
      }

      // Find product
      const { data: prod } = await supabase.from('products')
        .select('*').eq('business_id', businessId).ilike('name', `%${product}%`).maybeSingle()

      // Create invoice
      const { data: invoice } = await supabase.from('invoices')
        .insert({ business_id: businessId, customer_id: cust?.id, total_amount: amount, status: 'pending' })
        .select().single()

      // Add item and update stock
      let lowStock = null
      if (prod && invoice) {
        await supabase.from('invoice_items').insert({
          invoice_id: invoice.id, product_id: prod.id, quantity: qty, price: prod.price
        })
        const newStock = Math.max(0, prod.stock - qty)
        await supabase.from('products').update({ stock: newStock }).eq('id', prod.id)
        if (newStock <= (prod.low_stock_threshold || 5)) lowStock = newStock
      }

      // Update customer due
      if (cust) {
        await supabase.from('customers')
          .update({ total_due: (cust.total_due || 0) + amount, last_order_date: new Date().toISOString() })
          .eq('id', cust.id)
      }

      let reply = `✅ *Sale recorded!*\n\n📦 ${qty}x ${product}\n👤 ${customer}${isNew ? ' (new)' : ''}\n💰 ₹${amount.toLocaleString('en-IN')}\n📄 #${invoice?.id?.slice(0, 8).toUpperCase()}\n⏳ Payment: Pending`
      if (lowStock !== null) reply += `\n\n⚠️ Low stock: ${product} only ${lowStock} left!`
      return reply
    }

    case 'PAYMENT': {
      const { customer, amount } = intent
      const { data: cust } = await supabase.from('customers')
        .select('*').eq('business_id', businessId).ilike('name', `%${customer}%`).maybeSingle()

      if (!cust) return `❌ Customer "${customer}" not found.`

      const newDue = Math.max(0, (cust.total_due || 0) - amount)
      await supabase.from('customers').update({ total_due: newDue }).eq('id', cust.id)

      const { data: inv } = await supabase.from('invoices')
        .select('*').eq('customer_id', cust.id).eq('status', 'pending')
        .order('created_at', { ascending: true }).limit(1).maybeSingle()

      if (inv && amount >= inv.total_amount) {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', inv.id)
        await supabase.from('payments').insert({ invoice_id: inv.id, amount, method: 'cash' })
      }

      return `✅ *Payment recorded!*\n\n👤 ${cust.name}\n💵 ₹${amount.toLocaleString('en-IN')} received\n${newDue > 0 ? `💳 Still due: ₹${newDue.toLocaleString('en-IN')}` : '🎉 All dues cleared!'}`
    }

    case 'INSIGHTS': {
      const today = new Date().toISOString().split('T')[0]
      const { data: invs } = await supabase.from('invoices').select('*').eq('business_id', businessId)
      const todaySales = (invs || []).filter(i => i.created_at?.startsWith(today)).reduce((s, i) => s + (i.total_amount || 0), 0)
      const pending = (invs || []).filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || 0), 0)
      const pendingCount = (invs || []).filter(i => i.status === 'pending').length
      return `📊 *${bizName}*\n\n💰 Today: ₹${todaySales.toLocaleString('en-IN')}\n💳 Pending: ₹${pending.toLocaleString('en-IN')} (${pendingCount} invoices)\n📦 Total orders: ${invs?.length || 0}`
    }

    case 'STOCK': {
      const { data: prods } = await supabase.from('products').select('*').eq('business_id', businessId)
      if (!prods?.length) return `📦 No products added yet. Add from the app.`
      const low = prods.filter(p => p.stock <= (p.low_stock_threshold || 5))
      let reply = `📦 *Stock Summary*\n\n`
      prods.slice(0, 8).forEach(p => {
        reply += `${p.stock <= (p.low_stock_threshold || 5) ? '⚠️' : '✅'} ${p.name}: ${p.stock} units\n`
      })
      if (low.length > 0) reply += `\n*Reorder needed for ${low.length} items!*`
      return reply
    }

    case 'PENDING': {
      const { data: invs } = await supabase.from('invoices')
        .select('*, customers(name)').eq('business_id', businessId).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(5)
      if (!invs?.length) return `✅ No pending invoices! All payments clear.`
      const total = invs.reduce((s, i) => s + (i.total_amount || 0), 0)
      let reply = `⏳ *Pending Invoices (${invs.length})*\n\n`
      invs.forEach(i => { reply += `• ${i.customers?.name}: ₹${i.total_amount?.toLocaleString('en-IN')}\n` })
      reply += `\n💰 Total: ₹${total.toLocaleString('en-IN')}`
      return reply
    }

    case 'CUSTOMER': {
      const { data: cust } = await supabase.from('customers')
        .select('*').eq('business_id', businessId).ilike('name', `%${intent.name}%`).maybeSingle()
      if (!cust) return `❌ Customer "${intent.name}" not found.`
      const { data: invs } = await supabase.from('invoices').select('*').eq('customer_id', cust.id)
      const total = (invs || []).reduce((s, i) => s + (i.total_amount || 0), 0)
      return `👤 *${cust.name}*\n\n📋 Orders: ${invs?.length || 0}\n💰 Total: ₹${total.toLocaleString('en-IN')}\n💳 Due: ₹${(cust.total_due || 0).toLocaleString('en-IN')}`
    }

    default:
      return `🤔 Didn't understand.\n\nTry:\n• "Sold 5 cement to Ramesh for 2500"\n• "Ramesh paid 2000"\n• "How is my business?"\n• "Show pending invoices"\n• "Ramesh history"`
  }
}

// ─── Send WhatsApp via WATI ────────────────────────────────────────────────────
async function sendWA(phone, message) {
  if (!WATI_TOKEN) {
    console.log(`[NO WATI] Reply to ${phone}:\n${message}`)
    return
  }
  try {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const res = await fetch(
      `${process.env.WATI_API_URL}/api/v1/sendSessionMessage/91${cleanPhone}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${WATI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: message })
      }
    )
    if (!res.ok) console.error('WATI error:', await res.text())
  } catch (e) {
    console.error('Send WA error:', e.message)
  }
}

// ─── Parse incoming message from WATI/Meta formats ────────────────────────────
function parseMessage(body) {
  if (body.waId && body.text) return { phone: body.waId, text: body.text }
  if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    const m = body.entry[0].changes[0].value.messages[0]
    if (m.type === 'text') return { phone: m.from, text: m.text.body }
  }
  if (body.From && body.Body) return { phone: body.From.replace(/\D/g, '').slice(-10), text: body.Body }
  return null
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`VyaparMitra webhook running on port ${PORT}`))
