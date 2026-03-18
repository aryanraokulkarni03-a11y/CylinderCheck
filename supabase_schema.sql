-- ============================================
-- CylinderCheck — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. PIN Code intelligence table
--    Stores avg delivery times, shortage flags per PIN
CREATE TABLE IF NOT EXISTS pin_data (
  id          BIGSERIAL PRIMARY KEY,
  pin         TEXT NOT NULL UNIQUE,
  city        TEXT,
  state       TEXT,
  agency      TEXT,          -- IndianOil / HP Gas / Bharat Gas
  avg_days    NUMERIC(4,1) DEFAULT 5.0,
  shortage    BOOLEAN DEFAULT false,
  trend       TEXT DEFAULT 'stable',  -- stable / improving / worsening
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with major cities
INSERT INTO pin_data (pin, city, state, agency, avg_days, shortage, trend) VALUES
  ('110001', 'New Delhi',      'Delhi',          'IndianOil',   4.2, false, 'stable'),
  ('400001', 'Mumbai',         'Maharashtra',    'HP Gas',      6.8, true,  'worsening'),
  ('600001', 'Chennai',        'Tamil Nadu',     'Bharat Gas',  3.1, false, 'improving'),
  ('700001', 'Kolkata',        'West Bengal',    'IndianOil',   5.5, false, 'stable'),
  ('500001', 'Hyderabad',      'Telangana',      'HP Gas',      4.9, false, 'improving'),
  ('530001', 'Visakhapatnam',  'Andhra Pradesh', 'IndianOil',   5.2, false, 'stable'),
  ('522001', 'Guntur',         'Andhra Pradesh', 'Bharat Gas',  6.1, true,  'worsening'),
  ('560001', 'Bengaluru',      'Karnataka',      'HP Gas',      3.8, false, 'improving'),
  ('380001', 'Ahmedabad',      'Gujarat',        'IndianOil',   4.4, false, 'stable'),
  ('411001', 'Pune',           'Maharashtra',    'Bharat Gas',  5.0, false, 'stable')
ON CONFLICT (pin) DO NOTHING;

-- 2. Community reports table
--    Crowdsourced delay / shortage reports
--    Actual live columns (verified 2026-03-14):
CREATE TABLE IF NOT EXISTS reports (
  id            BIGSERIAL PRIMARY KEY,
  pin           TEXT NOT NULL,
  city          TEXT,
  issue         TEXT NOT NULL,
  votes         INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  user_id       UUID,            -- auth.users.id — set when signed in
  user_email    TEXT,            -- for admin reference
  delivery_days INT,             -- optional: how many days delivery took (1–30)
  is_hidden     BOOLEAN DEFAULT false,  -- admin soft-delete
  company       TEXT             -- IndianOil / HP Gas / Bharat Gas (Task 8)
);

-- Allow public read (exclude hidden) + auth insert
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reports"  ON reports FOR SELECT USING (is_hidden IS NOT TRUE);
CREATE POLICY "Anyone can insert report" ON reports FOR INSERT WITH CHECK (true);

-- 3. Alert subscriptions table
--    Stores email/phone for booking window alerts
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id              BIGSERIAL PRIMARY KEY,
  contact         TEXT NOT NULL,   -- email or phone
  pin             TEXT,
  last_booking    DATE,
  alert_type      TEXT DEFAULT 'free',  -- free / plus / annual
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Only the service role can read subscriptions (keep contacts private)
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert subscription" ON alert_subscriptions FOR INSERT WITH CHECK (true);

-- 4. LPG Prices table
CREATE TABLE IF NOT EXISTS lpg_prices (
  id          BIGSERIAL PRIMARY KEY,
  company     TEXT NOT NULL,
  price       NUMERIC(7,2) NOT NULL,
  city        TEXT DEFAULT 'Delhi',  -- prices vary by city
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO lpg_prices (company, price) VALUES
  ('IndianOil', 903.00),
  ('HP Gas',    906.00),
  ('Bharat Gas',901.00);

ALTER TABLE lpg_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read LPG prices" ON lpg_prices FOR SELECT USING (true);

-- 5. Paid subscriptions
--    Written by verify-payment edge function, read by admin stats.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   BIGSERIAL PRIMARY KEY,
  contact              TEXT,
  pin                  TEXT,
  razorpay_order_id    TEXT NOT NULL UNIQUE,
  razorpay_payment_id  TEXT NOT NULL UNIQUE,
  razorpay_signature   TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active',
  amount               INT NOT NULL DEFAULT 4900,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Commercial lead capture
--    Written by the commercial lead form when no direct vendor fit is available.
CREATE TABLE IF NOT EXISTS commercial_leads (
  id              BIGSERIAL PRIMARY KEY,
  business_name   TEXT NOT NULL,
  business_type   TEXT NOT NULL,
  city            TEXT,
  pin             TEXT,
  phone           TEXT NOT NULL,
  need_type       TEXT NOT NULL,
  cylinders_week  INT,
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commercial_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert commercial leads" ON commercial_leads FOR INSERT WITH CHECK (true);

-- 7. First-sign-in notification log
--    Used by the auth welcome email flow to avoid resending on normal session restores.
CREATE TABLE IF NOT EXISTS auth_notification_log (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL,
  email             TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  provider          TEXT NOT NULL DEFAULT 'resend',
  status            TEXT NOT NULL DEFAULT 'pending',
  last_error        TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS auth_notification_log_email_idx
  ON auth_notification_log (email);

CREATE INDEX IF NOT EXISTS auth_notification_log_status_idx
  ON auth_notification_log (status);

ALTER TABLE pin_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pin data" ON pin_data FOR SELECT USING (true);

ALTER TABLE auth_notification_log ENABLE ROW LEVEL SECURITY;

-- Live DB note (verified 2026-03-18):
-- The production project also contains auxiliary tables:
--   feedback, price_corrections, report_votes
-- They are not yet represented in this bootstrap schema because the
-- current frontend repo does not depend on their column contract directly.

-- ============================================
-- DONE. Now copy your Project URL + anon key
-- into .env.local
-- ============================================
