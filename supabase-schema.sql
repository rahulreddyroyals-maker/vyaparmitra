-- ============================================================
-- VyaparMitra Database Schema (PostgreSQL / Supabase)
-- Run this in Supabase SQL Editor: supabase.com → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,          -- Firebase UID
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT DEFAULT '',
  language    TEXT DEFAULT 'en',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Businesses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,             -- Retailer / Distributor / Manufacturer etc.
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  price               NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock               INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Customers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  total_due       NUMERIC(12,2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  due_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  method       TEXT DEFAULT 'cash' CHECK (method IN ('cash', 'upi', 'bank_transfer', 'other'))
);

-- ─── WhatsApp Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT,
  intent     TEXT,
  response   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own record
CREATE POLICY "users_own" ON users FOR ALL USING (id = auth.uid()::text);

-- Businesses owned by the user
CREATE POLICY "businesses_own" ON businesses FOR ALL
  USING (user_id = auth.uid()::text);

-- Products belong to user's business
CREATE POLICY "products_own" ON products FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()::text));

-- Customers belong to user's business
CREATE POLICY "customers_own" ON customers FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()::text));

-- Invoices belong to user's business
CREATE POLICY "invoices_own" ON invoices FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()::text));

-- Invoice items via invoice
CREATE POLICY "invoice_items_own" ON invoice_items FOR ALL
  USING (invoice_id IN (
    SELECT id FROM invoices
    WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()::text)
  ));

-- Payments via invoice
CREATE POLICY "payments_own" ON payments FOR ALL
  USING (invoice_id IN (
    SELECT id FROM invoices
    WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()::text)
  ));

-- WhatsApp logs for own user
CREATE POLICY "wap_logs_own" ON whatsapp_logs FOR ALL USING (user_id = auth.uid()::text);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_id ON whatsapp_logs(user_id);

-- ✅ Schema complete!
-- Next: Add your Supabase URL and Anon Key to .env file
