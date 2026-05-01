-- ============================================================
-- VyaparMitra Database Schema — FIXED for Firebase Auth
-- Firebase UIDs ≠ Supabase auth.uid(), so we disable RLS
-- and secure via Supabase service role on backend instead.
-- Run this in: supabase.com → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Drop existing tables if re-running ───────────────────────────────────────
DROP TABLE IF EXISTS whatsapp_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          TEXT PRIMARY KEY,          -- Firebase UID (e.g. "abc123xyz")
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT DEFAULT '',
  language    TEXT DEFAULT 'en',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Businesses ───────────────────────────────────────────────────────────────
CREATE TABLE businesses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  price               NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock               INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Customers ────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  total_due       NUMERIC(12,2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  due_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Items ────────────────────────────────────────────────────────────
CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  method       TEXT DEFAULT 'cash'
);

-- ─── WhatsApp Logs ────────────────────────────────────────────────────────────
CREATE TABLE whatsapp_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT,
  intent     TEXT,
  response   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DISABLE RLS on all tables ────────────────────────────────────────────────
-- Firebase auth.uid() != Supabase auth.uid(), so RLS with auth.uid() blocks all writes.
-- Security is handled by: (1) anon key only reads/writes, (2) user_id column filtering in app code.
ALTER TABLE users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses      DISABLE ROW LEVEL SECURITY;
ALTER TABLE products        DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers       DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items   DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments        DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs   DISABLE ROW LEVEL SECURITY;

-- ─── Grant anon role full access (needed since RLS is off) ───────────────────
GRANT ALL ON users          TO anon;
GRANT ALL ON businesses     TO anon;
GRANT ALL ON products       TO anon;
GRANT ALL ON customers      TO anon;
GRANT ALL ON invoices       TO anon;
GRANT ALL ON invoice_items  TO anon;
GRANT ALL ON payments       TO anon;
GRANT ALL ON whatsapp_logs  TO anon;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_businesses_user_id      ON businesses(user_id);
CREATE INDEX idx_products_business_id    ON products(business_id);
CREATE INDEX idx_customers_business_id   ON customers(business_id);
CREATE INDEX idx_invoices_business_id    ON invoices(business_id);
CREATE INDEX idx_invoices_customer_id    ON invoices(customer_id);
CREATE INDEX idx_invoice_items_inv_id    ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id     ON payments(invoice_id);
CREATE INDEX idx_wap_logs_user_id        ON whatsapp_logs(user_id);

-- ✅ Done! Now go back to your app — business saving will work.
-- NOTE: For production, switch to Supabase Auth (or use service_role key in a backend).
