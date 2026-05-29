// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('MISSING Supabase env vars! Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: { persistSession: true },
    global: {
      headers: { 'x-application-name': 'vyaparmitra' }
    }
  }
)

// Test connection
export const testConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const upsertUser = async (uid, phone, name = '', language = 'en') => {
  try {
    const { data: existing } = await supabase
      .from('users').select('*').eq('id', uid).maybeSingle()
    if (existing) {
      const { data, error } = await supabase
        .from('users').update({ language }).eq('id', uid).select().single()
      return { data, error }
    } else {
      const { data, error } = await supabase
        .from('users').insert({ id: uid, phone, name, language }).select().single()
      return { data, error }
    }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export const getUser = async (uid) => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', uid).single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// ─── Business ─────────────────────────────────────────────────────────────────
export const getBusiness = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('businesses').select('*').eq('user_id', userId).maybeSingle()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export const upsertBusiness = async (userId, name, type) => {
  try {
    const { data: existing } = await supabase
      .from('businesses').select('*').eq('user_id', userId).maybeSingle()
    if (existing) {
      const { data, error } = await supabase
        .from('businesses').update({ name, type }).eq('user_id', userId).select().single()
      return { data, error }
    } else {
      const { data, error } = await supabase
        .from('businesses').insert({ user_id: userId, name, type }).select().single()
      return { data, error }
    }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const getProducts = async (businessId) => {
  try {
    const { data, error } = await supabase
      .from('products').select('*').eq('business_id', businessId)
      .order('created_at', { ascending: false })
    return { data, error }
  } catch (e) {
    return { data: [], error: { message: e.message } }
  }
}

export const addProduct = async (businessId, product) => {
  try {
    const { data, error } = await supabase
      .from('products').insert({ business_id: businessId, ...product }).select().single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export const updateProduct = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('products').update(updates).eq('id', id).select().single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export const deleteProduct = async (id) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id)
    return { error }
  } catch (e) {
    return { error: { message: e.message } }
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────
export const getCustomers = async (businessId) => {
  try {
    const { data, error } = await supabase
      .from('customers').select('*').eq('business_id', businessId)
      .order('created_at', { ascending: false })
    return { data, error }
  } catch (e) {
    return { data: [], error: { message: e.message } }
  }
}

export const addCustomer = async (businessId, customer) => {
  try {
    const { data, error } = await supabase
      .from('customers').insert({ business_id: businessId, ...customer }).select().single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export const updateCustomer = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('customers').update(updates).eq('id', id).select().single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const getInvoices = async (businessId, status = null) => {
  try {
    let query = supabase
      .from('invoices')
      .select('*, customers(name, phone), invoice_items(*, products(name))')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    return { data, error }
  } catch (e) {
    return { data: [], error: { message: e.message } }
  }
}

export const addInvoice = async (businessId, customerId, items, totalAmount, dueDate) => {
  try {
    const { data: invoice, error: invErr } = await supabase
      .from('invoices').insert({
        business_id: businessId,
        customer_id: customerId,
        total_amount: totalAmount,
        status: 'pending',
        due_date: dueDate
      }).select().single()
    if (invErr) return { error: invErr }
    const invoiceItems = items.map(item => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }))
    const { error: itemsErr } = await supabase.from('invoice_items').insert(invoiceItems)
    return { data: invoice, error: itemsErr }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export const markInvoicePaid = async (invoiceId, amount, method = 'cash') => {
  try {
    await supabase.from('payments').insert({
      invoice_id: invoiceId, amount,
      payment_date: new Date().toISOString(), method
    })
    const { data, error } = await supabase
      .from('invoices').update({ status: 'paid' }).eq('id', invoiceId).select().single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

// ─── WhatsApp Logs ────────────────────────────────────────────────────────────
export const logWhatsAppMessage = async (userId, message, intent, response) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_logs')
      .insert({ user_id: userId, message, intent, response })
      .select().single()
    return { data, error }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}
