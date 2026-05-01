// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Users ────────────────────────────────────────────────────────────────────
export const upsertUser = async (uid, phone, name = '', language = 'en') => {
  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle()

  if (existing) {
    // Update language preference if changed
    const { data, error } = await supabase
      .from('users')
      .update({ language })
      .eq('id', uid)
      .select()
      .single()
    return { data, error }
  } else {
    const { data, error } = await supabase
      .from('users')
      .insert({ id: uid, phone, name, language })
      .select()
      .single()
    return { data, error }
  }
}

export const getUser = async (uid) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).single()
  return { data, error }
}

// ─── Business ─────────────────────────────────────────────────────────────────
export const getBusiness = async (userId) => {
  const { data, error } = await supabase.from('businesses').select('*').eq('user_id', userId).single()
  return { data, error }
}

export const upsertBusiness = async (userId, name, type) => {
  // First try to find existing business for this user
  const { data: existing } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('businesses')
      .update({ name, type })
      .eq('user_id', userId)
      .select()
      .single()
    return { data, error }
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('businesses')
      .insert({ user_id: userId, name, type })
      .select()
      .single()
    return { data, error }
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const getProducts = async (businessId) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addProduct = async (businessId, product) => {
  const { data, error } = await supabase
    .from('products')
    .insert({ business_id: businessId, ...product })
    .select()
    .single()
  return { data, error }
}

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single()
  return { data, error }
}

export const deleteProduct = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id)
  return { error }
}

// ─── Customers ────────────────────────────────────────────────────────────────
export const getCustomers = async (businessId) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addCustomer = async (businessId, customer) => {
  const { data, error } = await supabase
    .from('customers')
    .insert({ business_id: businessId, ...customer })
    .select()
    .single()
  return { data, error }
}

export const updateCustomer = async (id, updates) => {
  const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single()
  return { data, error }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const getInvoices = async (businessId, status = null) => {
  let query = supabase
    .from('invoices')
    .select('*, customers(name, phone), invoice_items(*, products(name))')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  return { data, error }
}

export const addInvoice = async (businessId, customerId, items, totalAmount, dueDate) => {
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({ business_id: businessId, customer_id: customerId, total_amount: totalAmount, status: 'pending', due_date: dueDate })
    .select()
    .single()
  if (invErr) return { error: invErr }

  const invoiceItems = items.map((item) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price,
  }))
  const { error: itemsErr } = await supabase.from('invoice_items').insert(invoiceItems)
  return { data: invoice, error: itemsErr }
}

export const markInvoicePaid = async (invoiceId, amount, method = 'cash') => {
  const { error: payErr } = await supabase
    .from('payments')
    .insert({ invoice_id: invoiceId, amount, payment_date: new Date().toISOString(), method })
  if (payErr) return { error: payErr }
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', invoiceId)
    .select()
    .single()
  return { data, error }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const getDashboardStats = async (businessId) => {
  const today = new Date().toISOString().split('T')[0]

  const [invoicesRes, paymentsRes, productsRes] = await Promise.all([
    supabase.from('invoices').select('total_amount, status, created_at').eq('business_id', businessId),
    supabase.from('payments').select('amount, payment_date').eq('invoice_id', supabase.from('invoices').select('id').eq('business_id', businessId)),
    supabase.from('products').select('name, stock, low_stock_threshold').eq('business_id', businessId),
  ])

  const invoices = invoicesRes.data || []
  const products = productsRes.data || []

  const todaySales = invoices
    .filter((inv) => inv.created_at?.startsWith(today))
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  const pendingPayments = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  const lowStockItems = products.filter((p) => p.stock <= (p.low_stock_threshold || 5))

  return { todaySales, pendingPayments, lowStockItems, totalInvoices: invoices.length }
}

// ─── WhatsApp Logs ────────────────────────────────────────────────────────────
export const logWhatsAppMessage = async (userId, message, intent, response) => {
  const { data, error } = await supabase
    .from('whatsapp_logs')
    .insert({ user_id: userId, message, intent, response })
    .select()
    .single()
  return { data, error }
}
