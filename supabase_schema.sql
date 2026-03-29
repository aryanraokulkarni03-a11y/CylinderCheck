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
  vote_baseline INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  user_id       UUID,            -- auth.users.id — set when signed in
  user_email    TEXT,            -- for admin reference
  delivery_days INT,             -- optional: how many days delivery took (1–30)
  is_hidden     BOOLEAN DEFAULT false,  -- admin soft-delete
  company       TEXT,            -- IndianOil / HP Gas / Bharat Gas (Task 8)
  CONSTRAINT reports_issue_length CHECK (char_length(issue) <= 1000),
  CONSTRAINT reports_city_length CHECK (char_length(city) <= 100)
);

-- Allow public read (exclude hidden) + auth insert
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reports"  ON reports FOR SELECT USING (is_hidden IS NOT TRUE);
CREATE POLICY "Authenticated users can insert report"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND pin ~ '^[0-9]{6}$'
    AND nullif(btrim(issue), '') IS NOT NULL
    AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
    AND (delivery_days IS NULL OR (delivery_days >= 1 AND delivery_days <= 30))
    AND (company IS NULL OR company IN ('IndianOil', 'HP Gas', 'Bharat Gas'))
  );

-- 2b. Report votes table
--     Signed-in users can upvote a report once.
CREATE TABLE IF NOT EXISTS report_votes (
  id         BIGSERIAL PRIMARY KEY,
  report_id  BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE report_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read own report votes"
  ON report_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert own report votes"
  ON report_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Alert subscriptions table
--    Stores email/phone for booking window alerts
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id              BIGSERIAL PRIMARY KEY,
  contact         TEXT NOT NULL,   -- email or phone
  pin             TEXT,
  last_booking    DATE,
  alert_type      TEXT DEFAULT 'free',  -- free / plus / annual
  channel         TEXT DEFAULT 'email',
  plan_code       TEXT DEFAULT 'free',
  delivery_status TEXT DEFAULT 'pending',
  next_send_at    TIMESTAMPTZ,
  last_sent_at    TIMESTAMPTZ,
  last_error      TEXT,
  reminder_type   TEXT DEFAULT 'booking_d_minus_2',
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT alert_subscriptions_contact_length CHECK (char_length(contact) <= 255)
);

-- Only the service role can read subscriptions (keep contacts private)
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert subscription"
  ON alert_subscriptions
  FOR INSERT
  WITH CHECK (
    nullif(btrim(contact), '') IS NOT NULL
    AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
    AND (last_booking IS NULL OR last_booking <= CURRENT_DATE)
    AND alert_type IN ('free', 'plus', 'annual')
    AND channel IN ('email', 'sms', 'whatsapp')
    AND plan_code IN ('free', 'plus_monthly', 'plus_annual', 'annual')
    AND delivery_status IN ('pending', 'needs_booking_date', 'scheduled', 'sent', 'failed')
    AND reminder_type IN ('booking_d_minus_2')
  );

-- 3b. Verified Track signals
--     Structured delivery / supply inputs from signed-in users.
CREATE TABLE IF NOT EXISTS pin_user_signals (
  id              BIGSERIAL PRIMARY KEY,
  pin             TEXT NOT NULL,
  pin_prefix3     TEXT GENERATED ALWAYS AS (left(pin, 3)) STORED,
  city            TEXT,
  state           TEXT,
  area            TEXT,
  user_id         UUID NOT NULL,
  user_email      TEXT,
  trust_tier      TEXT DEFAULT 'signed_in_user',
  source_weight   NUMERIC(4,2) DEFAULT 0.55,
  delivery_days   INT,
  pressure_level  TEXT,
  note            TEXT,
  active          BOOLEAN DEFAULT true,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '21 days'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pin_user_signals_pin_check
    CHECK (pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_user_signals_delivery_days_check
    CHECK (delivery_days IS NULL OR (delivery_days >= 1 AND delivery_days <= 30)),
  CONSTRAINT pin_user_signals_trust_tier_check
    CHECK (trust_tier IN ('signed_in_user', 'repeat_local_contributor', 'trusted_contributor', 'verified_local_contributor')),
  CONSTRAINT pin_user_signals_pressure_check
    CHECK (pressure_level IS NULL OR pressure_level IN ('low', 'building', 'active', 'severe')),
  CONSTRAINT pin_user_signals_payload_check
    CHECK (delivery_days IS NOT NULL OR pressure_level IS NOT NULL)
);

ALTER TABLE pin_user_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert own track signals"
  ON pin_user_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can read own track signals"
  ON pin_user_signals FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3e. Canonical PIN profiles
--     Normalized city/state/area for all-India Track reads.
CREATE TABLE IF NOT EXISTS pin_profiles (
  pin                 TEXT PRIMARY KEY,
  pin_prefix3         TEXT GENERATED ALWAYS AS (left(pin, 3)) STORED,
  canonical_city      TEXT,
  canonical_state     TEXT,
  canonical_area      TEXT,
  city_source         TEXT DEFAULT 'unknown',
  state_source        TEXT DEFAULT 'unknown',
  area_source         TEXT DEFAULT 'unknown',
  profile_confidence  TEXT DEFAULT 'low',
  last_report_at      TIMESTAMPTZ,
  last_signal_at      TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pin_profiles_pin_check
    CHECK (pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_profiles_city_source_check
    CHECK (city_source IN ('seed', 'report', 'signal', 'prefix_seed', 'unknown')),
  CONSTRAINT pin_profiles_state_source_check
    CHECK (state_source IN ('seed', 'report', 'signal', 'prefix_seed', 'unknown')),
  CONSTRAINT pin_profiles_area_source_check
    CHECK (area_source IN ('seed', 'report', 'signal', 'derived', 'unknown')),
  CONSTRAINT pin_profiles_confidence_check
    CHECK (profile_confidence IN ('low', 'medium', 'high'))
);

ALTER TABLE pin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pin profiles" ON pin_profiles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.enforce_pin_user_signal_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.pin_user_signals existing
    WHERE existing.user_id = NEW.user_id
      AND existing.pin = NEW.pin
      AND existing.created_at >= NOW() - INTERVAL '12 hours'
  ) THEN
    RAISE EXCEPTION 'track_signal_cooldown'
      USING HINT = 'You can add another local signal for this PIN after the cooldown window.';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pin_user_signals_guardrails_before_insert
  ON public.pin_user_signals;

CREATE TRIGGER pin_user_signals_guardrails_before_insert
  BEFORE INSERT ON public.pin_user_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pin_user_signal_guardrails();

-- 3c. Contributor trust profiles for Track signals
CREATE TABLE IF NOT EXISTS pin_contributor_profiles (
  user_id                   UUID PRIMARY KEY,
  home_pin                  TEXT,
  home_city                 TEXT,
  home_state                TEXT,
  manual_verification_tier  TEXT DEFAULT 'none',
  trust_tier                TEXT DEFAULT 'signed_in_user',
  source_weight             NUMERIC(4,2) DEFAULT 0.55,
  reputation_score          INT DEFAULT 0,
  signal_count_90d          INT DEFAULT 0,
  corroborated_count_90d    INT DEFAULT 0,
  distinct_pin_count_90d    INT DEFAULT 0,
  last_signal_at            TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pin_contributor_profiles_home_pin_check
    CHECK (home_pin IS NULL OR home_pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_contributor_profiles_manual_tier_check
    CHECK (manual_verification_tier IN ('none', 'trusted_contributor', 'verified_local_contributor')),
  CONSTRAINT pin_contributor_profiles_trust_tier_check
    CHECK (trust_tier IN ('signed_in_user', 'repeat_local_contributor', 'trusted_contributor', 'verified_local_contributor'))
);

ALTER TABLE pin_contributor_profiles ENABLE ROW LEVEL SECURITY;

-- 3d. Nearby-PIN graph for safer propagation
CREATE TABLE IF NOT EXISTS pin_neighbor_edges (
  pin            TEXT NOT NULL,
  nearby_pin     TEXT NOT NULL,
  relation_type  TEXT NOT NULL,
  edge_weight    NUMERIC(4,2) NOT NULL,
  city           TEXT,
  state          TEXT,
  active         BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pin, nearby_pin),
  CONSTRAINT pin_neighbor_edges_pin_check
    CHECK (pin ~ '^[0-9]{6}$' AND nearby_pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_neighbor_edges_relation_check
    CHECK (relation_type IN ('same_area_cluster', 'same_subcluster', 'same_city', 'same_prefix3')),
  CONSTRAINT pin_neighbor_edges_weight_check
    CHECK (edge_weight > 0 AND edge_weight <= 1),
  CONSTRAINT pin_neighbor_edges_no_self_check
    CHECK (pin <> nearby_pin)
);

ALTER TABLE pin_neighbor_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pin neighbor edges" ON pin_neighbor_edges FOR SELECT USING (true);

-- 4. LPG Prices table
CREATE TABLE IF NOT EXISTS lpg_prices (
  id          BIGSERIAL PRIMARY KEY,
  city        TEXT NOT NULL,
  state       TEXT,
  product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg',
  price       NUMERIC(7,2) NOT NULL,
  source_url  TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (city, product_type)
);

INSERT INTO lpg_prices (city, state, product_type, price) VALUES
  ('Delhi', 'Delhi', 'domestic_14_2kg', 903.00)
ON CONFLICT (city, product_type) DO NOTHING;

ALTER TABLE lpg_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read LPG prices" ON lpg_prices FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS lpg_price_scrape_log (
  id                BIGSERIAL PRIMARY KEY,
  city              TEXT NOT NULL,
  state             TEXT,
  product_type      TEXT NOT NULL,
  source_url        TEXT NOT NULL,
  candidate_price   NUMERIC(7,2),
  published_price   NUMERIC(7,2),
  parse_method      TEXT,
  validation_status TEXT NOT NULL,
  validation_reason TEXT,
  scraped_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lpg_price_scrape_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS scrape_runs (
  id                 BIGSERIAL PRIMARY KEY,
  scraper_name       TEXT NOT NULL,
  scrape_mode        TEXT NOT NULL DEFAULT 'production',
  source_host        TEXT NOT NULL,
  publish_enabled    BOOLEAN NOT NULL DEFAULT true,
  target_count       INT NOT NULL DEFAULT 0,
  max_concurrency    INT NOT NULL DEFAULT 1,
  request_jitter_ms  INT NOT NULL DEFAULT 0,
  retry_limit        INT NOT NULL DEFAULT 0,
  proxy_label        TEXT,
  status             TEXT NOT NULL DEFAULT 'running',
  config_snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary            JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_runs_mode_check CHECK (scrape_mode IN ('production', 'sandbox')),
  CONSTRAINT scrape_runs_status_check CHECK (status IN ('running', 'completed', 'failed'))
);

ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS scrape_request_log (
  id                 BIGSERIAL PRIMARY KEY,
  run_id             BIGINT REFERENCES scrape_runs(id) ON DELETE CASCADE,
  scraper_name       TEXT NOT NULL,
  scrape_mode        TEXT NOT NULL DEFAULT 'production',
  source_host        TEXT NOT NULL,
  target_key         TEXT NOT NULL,
  target_url         TEXT NOT NULL,
  request_url        TEXT NOT NULL,
  proxy_label        TEXT,
  attempt            INT NOT NULL DEFAULT 1,
  status_code        INT,
  request_status     TEXT NOT NULL,
  latency_ms         INT,
  error_message      TEXT,
  rate_limited       BOOLEAN NOT NULL DEFAULT false,
  blocked_suspected  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_request_log_mode_check CHECK (scrape_mode IN ('production', 'sandbox')),
  CONSTRAINT scrape_request_log_status_check CHECK (request_status IN ('success', 'timeout', 'rate_limited', 'blocked', 'http_error', 'network_error'))
);

ALTER TABLE scrape_request_log ENABLE ROW LEVEL SECURITY;

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
  plan_code            TEXT DEFAULT 'plus_monthly',
  delivery_enabled     BOOLEAN DEFAULT false,
  expires_at           TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
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
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT commercial_leads_business_name_length CHECK (char_length(business_name) <= 200),
  CONSTRAINT commercial_leads_message_length CHECK (char_length(message) <= 2000)
);

ALTER TABLE commercial_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert commercial leads"
  ON commercial_leads
  FOR INSERT
  WITH CHECK (
    nullif(btrim(business_name), '') IS NOT NULL
    AND nullif(btrim(business_type), '') IS NOT NULL
    AND nullif(btrim(phone), '') IS NOT NULL
    AND nullif(btrim(need_type), '') IS NOT NULL
    AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
    AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
    AND business_type IN ('restaurant', 'hotel', 'dhaba', 'bakery', 'catering', 'cloud_kitchen', 'other')
    AND need_type IN ('induction', 'electric', 'kerosene', 'png', 'not_sure', 'other')
    AND (cylinders_week IS NULL OR (cylinders_week >= 1 AND cylinders_week <= 1000))
    AND (message IS NULL OR char_length(message) <= 2000)
  );

-- 6b. Commercial vendor directory
--     Used by the business directory and commercial city SEO pages.
CREATE TABLE IF NOT EXISTS vendors (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'other',
  city                TEXT NOT NULL,
  tagline             TEXT,
  description         TEXT,
  whatsapp            TEXT,
  phone               TEXT,
  website             TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  featured            BOOLEAN NOT NULL DEFAULT false,
  listing_expires_at  TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  license_number      TEXT,
  verified_at         TIMESTAMPTZ,
  verification_notes  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vendors_category_check
    CHECK (category IN ('induction', 'electric', 'kerosene', 'png', 'other')),
  CONSTRAINT vendors_verification_status_check
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  CONSTRAINT vendors_name_length_check
    CHECK (char_length(name) <= 200),
  CONSTRAINT vendors_city_length_check
    CHECK (char_length(city) <= 120),
  CONSTRAINT vendors_tagline_length_check
    CHECK (tagline IS NULL OR char_length(tagline) <= 240),
  CONSTRAINT vendors_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 4000),
  CONSTRAINT vendors_website_length_check
    CHECK (website IS NULL OR char_length(website) <= 500),
  CONSTRAINT vendors_license_length_check
    CHECK (license_number IS NULL OR char_length(license_number) <= 120)
);

CREATE INDEX IF NOT EXISTS vendors_city_idx
  ON vendors (city);

CREATE INDEX IF NOT EXISTS vendors_active_verification_idx
  ON vendors (active, verification_status, featured);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active vendors"
  ON vendors
  FOR SELECT
  USING (active = true);

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

-- 8. Normalized news storage
--    Populated by the scheduled scrape-news edge function and read by lpg-news.
CREATE TABLE IF NOT EXISTS news_articles (
  id           BIGSERIAL PRIMARY KEY,
  article_key  TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  source       TEXT NOT NULL,
  link         TEXT NOT NULL,
  google_link  TEXT NOT NULL,
  source_url   TEXT,
  category     TEXT NOT NULL,
  city         TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_articles_published_at_idx
  ON news_articles (published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_scraped_at_idx
  ON news_articles (scraped_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_city_idx
  ON news_articles (city);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news articles" ON news_articles FOR SELECT USING (true);

-- 11. Support feedback intake
--     Reserved for support workflow capture and future product feedback forms.
CREATE TABLE IF NOT EXISTS feedback (
  id          BIGSERIAL PRIMARY KEY,
  contact     TEXT,
  channel     TEXT NOT NULL DEFAULT 'email',
  topic       TEXT NOT NULL DEFAULT 'general',
  subject     TEXT,
  message     TEXT NOT NULL,
  route       TEXT,
  city        TEXT,
  pin         TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_channel_check
    CHECK (channel IN ('email', 'support_form', 'manual')),
  CONSTRAINT feedback_topic_check
    CHECK (topic IN ('general', 'billing', 'data_correction', 'vendor_listing', 'account_access', 'product_feedback')),
  CONSTRAINT feedback_status_check
    CHECK (status IN ('new', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT feedback_message_length_check
    CHECK (char_length(message) <= 4000),
  CONSTRAINT feedback_subject_length_check
    CHECK (subject IS NULL OR char_length(subject) <= 240),
  CONSTRAINT feedback_route_length_check
    CHECK (route IS NULL OR char_length(route) <= 240),
  CONSTRAINT feedback_city_length_check
    CHECK (city IS NULL OR char_length(city) <= 120),
  CONSTRAINT feedback_pin_check
    CHECK (pin IS NULL OR pin ~ '^[0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS feedback_status_created_at_idx
  ON feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_topic_created_at_idx
  ON feedback (topic, created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (
    nullif(btrim(message), '') IS NOT NULL
    AND (contact IS NULL OR nullif(btrim(contact), '') IS NOT NULL)
    AND (subject IS NULL OR char_length(subject) <= 240)
    AND (route IS NULL OR nullif(btrim(route), '') IS NOT NULL)
    AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
    AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
  );

-- 12. Price correction intake
--     Stores suggested corrections before they are reviewed and applied.
CREATE TABLE IF NOT EXISTS price_corrections (
  id                    BIGSERIAL PRIMARY KEY,
  city                  TEXT,
  state                 TEXT,
  pin                   TEXT,
  product_type          TEXT,
  reported_price        NUMERIC(7,2),
  current_display_price NUMERIC(7,2),
  source_url            TEXT,
  correction_note       TEXT NOT NULL,
  reporter_contact      TEXT,
  reporter_name         TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT price_corrections_product_type_check
    CHECK (product_type IS NULL OR product_type IN ('domestic_14_2kg', 'commercial_19kg')),
  CONSTRAINT price_corrections_status_check
    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  CONSTRAINT price_corrections_pin_check
    CHECK (pin IS NULL OR pin ~ '^[0-9]{6}$'),
  CONSTRAINT price_corrections_note_length_check
    CHECK (char_length(correction_note) <= 4000),
  CONSTRAINT price_corrections_city_length_check
    CHECK (city IS NULL OR char_length(city) <= 120),
  CONSTRAINT price_corrections_state_length_check
    CHECK (state IS NULL OR char_length(state) <= 120),
  CONSTRAINT price_corrections_source_length_check
    CHECK (source_url IS NULL OR char_length(source_url) <= 500)
);

CREATE INDEX IF NOT EXISTS price_corrections_status_created_at_idx
  ON price_corrections (status, created_at DESC);

CREATE INDEX IF NOT EXISTS price_corrections_city_product_idx
  ON price_corrections (city, product_type, created_at DESC);

ALTER TABLE price_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert price corrections"
  ON price_corrections
  FOR INSERT
  WITH CHECK (
    nullif(btrim(correction_note), '') IS NOT NULL
    AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
    AND (state IS NULL OR nullif(btrim(state), '') IS NOT NULL)
    AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
    AND (reporter_contact IS NULL OR nullif(btrim(reporter_contact), '') IS NOT NULL)
    AND (reporter_name IS NULL OR nullif(btrim(reporter_name), '') IS NOT NULL)
  );

-- ============================================
-- DONE. Now copy your Project URL + anon key
-- into .env.local
-- ============================================
