# 🏪 VyaparMitra — మీ వ్యాపారం, మా తోడు

**Run Your Business, We've Got Your Back.**

WhatsApp-first business management SaaS for Indian MSMEs. Billing, inventory, customer management, and AI-powered insights — all via WhatsApp messages.

---

## ✨ Features

- 📱 **WhatsApp-First** — manage business by sending messages
- 🧾 **Billing & Invoicing** — create, share, and track invoices
- 📦 **Inventory Management** — real-time stock tracking with alerts
- 👥 **Customer CRM** — order history, due tracking, payment reminders
- 📊 **Reports** — daily/weekly sales charts, CSV export for CA
- 🔐 **OTP Login** — phone number login via Firebase (no passwords)
- 🌐 **Bilingual** — English + Telugu support
- 💾 **Supabase** — production PostgreSQL with Row Level Security

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/vyaparmitra.git
cd vyaparmitra
npm install
```

### 2. Set Up Firebase (OTP Auth)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project → **Add Web App**
3. Enable **Authentication → Phone** provider
4. Copy your config values

### 3. Set Up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor** → paste contents of `supabase-schema.sql` → Run
3. Go to **Project Settings → API** → copy URL and anon key

### 4. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your Firebase and Supabase credentials
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### 5. Run Locally

```bash
npm run dev
# App runs at http://localhost:5173
```

---

## 🌐 Deploy to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

### Option B — GitHub + Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import repository
3. Add all `VITE_*` environment variables in Settings → Environment Variables
4. Deploy!

> **Important:** In Firebase Console → Authentication → Settings → Authorized domains, add your Vercel domain (e.g., `vyaparmitra.vercel.app`)

---

## 🗄️ Database Schema

Tables: `users`, `businesses`, `products`, `customers`, `invoices`, `invoice_items`, `payments`, `whatsapp_logs`

Full schema with RLS policies: see `supabase-schema.sql`

---

## 📱 WhatsApp Business API (Next Step)

To enable WhatsApp automation:

1. Apply for **Meta WhatsApp Business API** at [business.facebook.com](https://business.facebook.com)
2. Or use providers: **Twilio**, **Wati**, **Interakt**, **Gupshup**
3. Set up webhook → your backend (Node.js/Express)
4. Use LLM (Claude/OpenAI/Groq) to parse messages → update Supabase

### Example Flow
```
User WhatsApp: "Sold 5 cement to Ramesh for 2500"
          ↓
    Webhook → Node.js
          ↓
    LLM parses intent + entities
          ↓
    Creates invoice in Supabase
          ↓
    Reply: ✅ Invoice created, ₹2500 pending from Ramesh
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Auth | Firebase Phone OTP |
| Database | Supabase (PostgreSQL) |
| Charts | Recharts |
| Deployment | Vercel |
| Fonts | Baloo 2 + Noto Sans (Telugu) |

---

## 💰 Monetization (Planned)

- **Free** — up to 50 invoices/month
- **Basic ₹99/mo** — unlimited invoices + WhatsApp bot
- **Pro ₹299/mo** — GST reports + reminders
- **Advanced ₹999/mo** — multi-user + analytics + CA export

---

## 📁 Project Structure

```
vyaparmitra/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx      # Firebase + Supabase auth state
│   ├── lib/
│   │   ├── firebase.js          # Firebase setup
│   │   └── supabase.js          # All DB queries
│   ├── pages/
│   │   ├── AuthPage.jsx         # OTP login + language select
│   │   ├── OnboardingPage.jsx   # 3-step business setup
│   │   ├── DashboardPage.jsx    # Overview + charts
│   │   ├── ProductsPage.jsx     # Inventory management
│   │   ├── CustomersPage.jsx    # CRM + reminders
│   │   ├── InvoicesPage.jsx     # Create & manage invoices
│   │   └── ReportsPage.jsx      # Analytics + CSV export
│   ├── components/
│   │   └── Layout.jsx           # Sidebar navigation
│   ├── App.jsx                  # Routes + auth guards
│   └── main.jsx
├── supabase-schema.sql          # Run in Supabase SQL Editor
├── vercel.json                  # Vercel SPA config
└── .env.example                 # Environment variable template
```

---

## 🔒 Security

- Row Level Security (RLS) on all Supabase tables
- Users can only access their own business data
- Firebase handles phone OTP — no passwords stored
- HTTPS enforced by Vercel

---

Built with ❤️ for Indian MSMEs. సులభంగా • నమ్మకం • వేగంగా • మీ కోసం
