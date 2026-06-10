// src/lib/whatsapp.js
// VyaparMitra WhatsApp Integration Layer
// Works in SIMULATOR mode by default
// Switch to LIVE mode by adding VITE_WATI_API_URL + VITE_WATI_API_TOKEN in env vars

const WATI_API_URL = import.meta.env.VITE_WATI_API_URL   // e.g. https://live-server-xxxxx.wati.io
const WATI_TOKEN   = import.meta.env.VITE_WATI_API_TOKEN  // Bearer token from WATI dashboard

// Detect if WhatsApp API is configured
export const isWhatsAppLive = () => {
  return !!(WATI_API_URL && WATI_TOKEN &&
    !WATI_API_URL.includes('YOUR_') &&
    WATI_TOKEN.length > 10)
}

// Send a WhatsApp message
// In simulator mode: logs to console + returns mock response
// In live mode: sends real WhatsApp via WATI API
export const sendWhatsApp = async (phone, message) => {
  const live = isWhatsAppLive()

  if (!live) {
    // SIMULATOR MODE - just log, no real message sent
    console.log(`[WA SIMULATOR] To: ${phone}\n${message}`)
    return { success: true, mode: 'simulator', phone, message }
  }

  // LIVE MODE - send via WATI
  try {
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '').replace(/^91/, '')
    const fullPhone = `91${cleanPhone}`

    const res = await fetch(
      `${WATI_API_URL}/api/v1/sendSessionMessage/${fullPhone}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WATI_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageText: message }),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'WATI API error')
    return { success: true, mode: 'live', data }
  } catch (err) {
    console.error('[WA LIVE] Send error:', err)
    return { success: false, error: err.message }
  }
}

// Send payment reminder to a customer
export const sendPaymentReminder = async (customer, business, amount) => {
  const msg =
    `Hello ${customer.name}! 👋\n\n` +
    `This is a reminder from *${business.name}*.\n\n` +
    `You have a pending payment of *Rs.${amount.toLocaleString('en-IN')}*.\n\n` +
    `Please clear at your earliest convenience.\n\n` +
    `Thank you! 🙏\n` +
    `_VyaparMitra - Business Manager_`

  return sendWhatsApp(customer.phone, msg)
}

// Send invoice share message
export const sendInvoiceWhatsApp = async (customer, business, invoice) => {
  const msg =
    `🧾 *Invoice from ${business.name}*\n\n` +
    `Customer: ${customer.name}\n` +
    `Invoice: #${invoice.id?.slice(0, 8).toUpperCase()}\n` +
    `Amount: *Rs.${invoice.total_amount?.toLocaleString('en-IN')}*\n` +
    `Status: ${invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending'}\n` +
    `Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}\n\n` +
    `Thank you for your business! 🙏`

  return sendWhatsApp(customer.phone, msg)
}

// Send low stock alert to business owner
export const sendLowStockAlert = async (ownerPhone, business, products) => {
  const productList = products
    .map(p => `• ${p.name}: only ${p.stock} units left`)
    .join('\n')

  const msg =
    `⚠️ *Low Stock Alert - ${business.name}*\n\n` +
    `The following products are running low:\n\n` +
    `${productList}\n\n` +
    `Please reorder soon!\n` +
    `_VyaparMitra Business Manager_`

  return sendWhatsApp(ownerPhone, msg)
}

// Process incoming WhatsApp message (for webhook)
// This is called when a customer sends a message to your WhatsApp Business number
export const processIncomingMessage = async (fromPhone, messageText, businessId) => {
  // Import here to avoid circular deps
  const { parseAndExecuteIntent } = await import('./intentProcessor.js')
  return parseAndExecuteIntent(fromPhone, messageText, businessId)
}

// Get WhatsApp API status for display in UI
export const getWhatsAppStatus = () => {
  if (isWhatsAppLive()) {
    return {
      mode: 'live',
      label: 'WhatsApp API Active',
      description: 'Real WhatsApp messages being sent via WATI',
      color: 'text-green-400',
      bgColor: 'bg-green-900/40',
      badge: '🟢 Live',
    }
  }
  return {
    mode: 'simulator',
    label: 'Simulator Mode',
    description: 'Demo mode — add API key to go live',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30',
    badge: '🔵 Demo',
  }
}

// Instructions for activating WhatsApp API
export const ACTIVATION_STEPS = [
  {
    step: 1,
    title: 'Sign up for WATI (Recommended for India)',
    description: 'Go to wati.io → Sign up → Connect your WhatsApp Business number',
    url: 'https://wati.io',
    free: false,
    cost: 'Rs.2,000/month',
  },
  {
    step: 2,
    title: 'Get your API credentials',
    description: 'WATI Dashboard → Settings → API → Copy API URL and Token',
    url: null,
    free: false,
    cost: 'Included with WATI',
  },
  {
    step: 3,
    title: 'Add to environment variables',
    description: 'Add VITE_WATI_API_URL and VITE_WATI_API_TOKEN to Vercel/Netlify',
    url: null,
    free: true,
    cost: 'Free',
  },
  {
    step: 4,
    title: 'Set webhook URL in WATI',
    description: 'WATI Dashboard → Webhook → Set URL to your backend webhook endpoint',
    url: null,
    free: true,
    cost: 'Free',
  },
]
