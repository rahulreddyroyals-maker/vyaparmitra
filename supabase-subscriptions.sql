-- Run this in Supabase SQL Editor
-- Adds subscription management tables

CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'trial', 'premium')),
  status        TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'trial', 'active', 'expired', 'cancelled')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount        NUMERIC(10,2),
  trial_end     TIMESTAMPTZ,
  starts_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  payment_ref   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Disable RLS (same as other tables)
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON subscriptions TO anon;
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- View for easy subscription checking
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT s.*, b.name as business_name, b.type as business_type
FROM subscriptions s
JOIN businesses b ON b.id = s.business_id
WHERE s.status IN ('active', 'trial')
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
  AND (s.trial_end IS NULL OR s.trial_end > NOW() OR s.status = 'active');

GRANT SELECT ON active_subscriptions TO anon;
