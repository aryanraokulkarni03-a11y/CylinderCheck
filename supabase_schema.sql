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

-- 13. Scrape config foundation
--     Repo-managed cities, sources, topics, and runtime knobs for scraper workflows.
CREATE TABLE IF NOT EXISTS city_registry (
  id                     BIGSERIAL PRIMARY KEY,
  city_key               TEXT NOT NULL UNIQUE,
  city_name              TEXT NOT NULL UNIQUE,
  canonical_slug         TEXT NOT NULL UNIQUE,
  state_name             TEXT NOT NULL,
  price_source_slug      TEXT,
  aliases                TEXT[] NOT NULL DEFAULT '{}'::text[],
  display_priority       INTEGER NOT NULL DEFAULT 100,
  household_seo_enabled  BOOLEAN NOT NULL DEFAULT false,
  commercial_seo_enabled BOOLEAN NOT NULL DEFAULT false,
  price_scrape_enabled   BOOLEAN NOT NULL DEFAULT false,
  news_enabled           BOOLEAN NOT NULL DEFAULT false,
  news_location_enabled  BOOLEAN NOT NULL DEFAULT false,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT city_registry_key_length_check
    CHECK (char_length(city_key) <= 80),
  CONSTRAINT city_registry_name_length_check
    CHECK (char_length(city_name) <= 120),
  CONSTRAINT city_registry_slug_length_check
    CHECK (char_length(canonical_slug) <= 120),
  CONSTRAINT city_registry_state_length_check
    CHECK (char_length(state_name) <= 120),
  CONSTRAINT city_registry_source_slug_length_check
    CHECK (price_source_slug IS NULL OR char_length(price_source_slug) <= 120),
  CONSTRAINT city_registry_priority_check
    CHECK (display_priority BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS city_registry_display_priority_idx
  ON city_registry (display_priority, city_name);

CREATE INDEX IF NOT EXISTS city_registry_surface_flags_idx
  ON city_registry (
    household_seo_enabled,
    commercial_seo_enabled,
    price_scrape_enabled,
    news_enabled
  );

ALTER TABLE city_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read SEO-enabled cities"
  ON city_registry
  FOR SELECT
  USING (
    household_seo_enabled = true
    OR commercial_seo_enabled = true
  );

INSERT INTO city_registry (
  city_key,
  city_name,
  canonical_slug,
  state_name,
  price_source_slug,
  aliases,
  display_priority,
  household_seo_enabled,
  commercial_seo_enabled,
  price_scrape_enabled,
  news_enabled,
  news_location_enabled,
  metadata
) VALUES
  ('bangalore', 'Bangalore', 'bangalore', 'Karnataka', 'bangalore', ARRAY['bengaluru'], 10, true, true, true, true, true, '{"zone":"south","commercial_launch_wave":"wave_1"}'::jsonb),
  ('mumbai', 'Mumbai', 'mumbai', 'Maharashtra', 'mumbai', ARRAY['bombay'], 20, true, true, true, true, true, '{"zone":"west","commercial_launch_wave":"wave_1"}'::jsonb),
  ('delhi', 'Delhi', 'delhi', 'Delhi', 'new-delhi', ARRAY['new delhi'], 30, true, true, true, true, true, '{"zone":"north","commercial_launch_wave":"wave_1"}'::jsonb),
  ('pune', 'Pune', 'pune', 'Maharashtra', 'pune', ARRAY[]::text[], 40, true, true, true, true, true, '{"zone":"west","commercial_launch_wave":"wave_1"}'::jsonb),
  ('hyderabad', 'Hyderabad', 'hyderabad', 'Telangana', 'hyderabad', ARRAY[]::text[], 50, true, true, true, true, true, '{"zone":"south","commercial_launch_wave":"wave_1"}'::jsonb),
  ('chennai', 'Chennai', 'chennai', 'Tamil Nadu', 'chennai', ARRAY['madras'], 60, true, false, true, true, true, '{"zone":"south"}'::jsonb),
  ('kolkata', 'Kolkata', 'kolkata', 'West Bengal', 'kolkata', ARRAY['calcutta'], 70, true, false, true, true, true, '{"zone":"east"}'::jsonb),
  ('ahmedabad', 'Ahmedabad', 'ahmedabad', 'Gujarat', 'ahmedabad', ARRAY[]::text[], 80, true, false, true, true, true, '{"zone":"west"}'::jsonb),
  ('surat', 'Surat', 'surat', 'Gujarat', NULL, ARRAY[]::text[], 90, true, false, false, false, false, '{"zone":"west"}'::jsonb),
  ('gurugram', 'Gurugram', 'gurugram', 'Haryana', NULL, ARRAY['gurgaon'], 100, true, false, false, false, false, '{"zone":"north"}'::jsonb),
  ('vizag', 'Vizag', 'vizag', 'Andhra Pradesh', 'visakhapatnam', ARRAY['visakhapatnam'], 110, false, false, true, true, true, '{"zone":"south"}'::jsonb),
  ('jaipur', 'Jaipur', 'jaipur', 'Rajasthan', 'jaipur', ARRAY[]::text[], 120, false, false, true, true, true, '{"zone":"north"}'::jsonb),
  ('lucknow', 'Lucknow', 'lucknow', 'Uttar Pradesh', 'lucknow', ARRAY[]::text[], 130, false, false, true, true, true, '{"zone":"north"}'::jsonb),
  ('patna', 'Patna', 'patna', 'Bihar', 'patna', ARRAY[]::text[], 140, false, false, true, true, true, '{"zone":"east"}'::jsonb),
  ('kochi', 'Kochi', 'kochi', 'Kerala', NULL, ARRAY['cochin'], 150, false, false, false, true, true, '{"zone":"south"}'::jsonb),
  ('ranchi', 'Ranchi', 'ranchi', 'Jharkhand', NULL, ARRAY[]::text[], 160, false, false, false, true, true, '{"zone":"east"}'::jsonb)
ON CONFLICT (city_key) DO UPDATE SET
  city_name = EXCLUDED.city_name,
  canonical_slug = EXCLUDED.canonical_slug,
  state_name = EXCLUDED.state_name,
  price_source_slug = EXCLUDED.price_source_slug,
  aliases = EXCLUDED.aliases,
  display_priority = EXCLUDED.display_priority,
  household_seo_enabled = EXCLUDED.household_seo_enabled,
  commercial_seo_enabled = EXCLUDED.commercial_seo_enabled,
  price_scrape_enabled = EXCLUDED.price_scrape_enabled,
  news_enabled = EXCLUDED.news_enabled,
  news_location_enabled = EXCLUDED.news_location_enabled,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS scrape_source_registry (
  id                  BIGSERIAL PRIMARY KEY,
  source_key          TEXT NOT NULL UNIQUE,
  source_name         TEXT NOT NULL,
  source_kind         TEXT NOT NULL,
  fetch_mode          TEXT NOT NULL,
  host                TEXT,
  base_url            TEXT NOT NULL,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  publish_enabled     BOOLEAN NOT NULL DEFAULT false,
  priority            INTEGER NOT NULL DEFAULT 100,
  timeout_ms          INTEGER NOT NULL DEFAULT 8000,
  request_jitter_ms   INTEGER NOT NULL DEFAULT 0,
  retry_limit         INTEGER NOT NULL DEFAULT 0,
  retry_base_delay_ms INTEGER NOT NULL DEFAULT 1000,
  notes               TEXT,
  config              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_source_registry_kind_check
    CHECK (source_kind IN ('price', 'news', 'shared')),
  CONSTRAINT scrape_source_registry_fetch_mode_check
    CHECK (fetch_mode IN ('html', 'rss', 'api', 'manual')),
  CONSTRAINT scrape_source_registry_key_length_check
    CHECK (char_length(source_key) <= 120),
  CONSTRAINT scrape_source_registry_name_length_check
    CHECK (char_length(source_name) <= 200),
  CONSTRAINT scrape_source_registry_host_length_check
    CHECK (host IS NULL OR char_length(host) <= 200),
  CONSTRAINT scrape_source_registry_priority_check
    CHECK (priority BETWEEN 1 AND 1000),
  CONSTRAINT scrape_source_registry_timeout_check
    CHECK (timeout_ms BETWEEN 250 AND 60000),
  CONSTRAINT scrape_source_registry_jitter_check
    CHECK (request_jitter_ms BETWEEN 0 AND 30000),
  CONSTRAINT scrape_source_registry_retry_limit_check
    CHECK (retry_limit BETWEEN 0 AND 10),
  CONSTRAINT scrape_source_registry_retry_delay_check
    CHECK (retry_base_delay_ms BETWEEN 100 AND 60000)
);

CREATE INDEX IF NOT EXISTS scrape_source_registry_kind_priority_idx
  ON scrape_source_registry (source_kind, enabled, priority);

ALTER TABLE scrape_source_registry ENABLE ROW LEVEL SECURITY;

INSERT INTO scrape_source_registry (
  source_key,
  source_name,
  source_kind,
  fetch_mode,
  host,
  base_url,
  enabled,
  publish_enabled,
  priority,
  timeout_ms,
  request_jitter_ms,
  retry_limit,
  retry_base_delay_ms,
  notes,
  config
) VALUES
  (
    'goodreturns_price_html',
    'Goodreturns LPG city price pages',
    'price',
    'html',
    'www.goodreturns.in',
    'https://www.goodreturns.in',
    true,
    true,
    10,
    8000,
    900,
    1,
    1400,
    'Current primary HTML source for domestic and commercial LPG city prices.',
    '{"city_path_template":"/lpg-price-in-{slug}.html","product_types":["domestic_14_2kg","commercial_19kg"]}'::jsonb
  ),
  (
    'indane_locator_html',
    'Indane official locator product pages',
    'price',
    'html',
    'locator.iocl.com',
    'https://locator.iocl.com',
    true,
    false,
    20,
    9000,
    1200,
    1,
    1800,
    'Official fallback source for city LPG prices using manually approved Indane agency pages.',
    '{
      "parser_mode":"indane_locator_products",
      "city_url_map":{
        "bangalore":["https://locator.iocl.com/indane/indane-himu-distrubutors-gas-agency-basaveswara-nagar-bengaluru-209876/Home"],
        "mumbai":["https://locator.iocl.com/indane/indane-khara-natural-resources-gas-agency-goregaon-east-mumbai-296697/Home"],
        "new-delhi":["https://locator.iocl.com/indane/indane-d-s-gas-service-gas-agency-budh-vihar-new-delhi-123579/Home"],
        "pune":["https://locator.iocl.com/indane/indane-cme-gas-agency-gas-agency-dapodi-pune-296222/Home"],
        "hyderabad":["https://locator.iocl.com/indane/indane-jaykay-gas-service-gas-agency-habsiguda-hyderabad-212714/Home"]
      },
      "product_labels":{
        "domestic_14_2kg":["Indane 14.2 kg Domestic Cylinder"],
        "commercial_19kg":["Indane 19kg XtraTeJ Cylinder","Indane 19kg Non-Domestic Cylinder","Indane 19 kg"]
      }
    }'::jsonb
  ),
  (
    'google_news_rss',
    'Google News RSS search',
    'news',
    'rss',
    'news.google.com',
    'https://news.google.com',
    true,
    false,
    10,
    8000,
    0,
    1,
    1200,
    'Current free-first ingestion source for LPG topic discovery.',
    '{"rss_search_template":"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"}'::jsonb
  )
ON CONFLICT (source_key) DO UPDATE SET
  source_name = EXCLUDED.source_name,
  source_kind = EXCLUDED.source_kind,
  fetch_mode = EXCLUDED.fetch_mode,
  host = EXCLUDED.host,
  base_url = EXCLUDED.base_url,
  enabled = EXCLUDED.enabled,
  publish_enabled = EXCLUDED.publish_enabled,
  priority = EXCLUDED.priority,
  timeout_ms = EXCLUDED.timeout_ms,
  request_jitter_ms = EXCLUDED.request_jitter_ms,
  retry_limit = EXCLUDED.retry_limit,
  retry_base_delay_ms = EXCLUDED.retry_base_delay_ms,
  notes = EXCLUDED.notes,
  config = EXCLUDED.config,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS scrape_topic_registry (
  id             BIGSERIAL PRIMARY KEY,
  topic_key      TEXT NOT NULL UNIQUE,
  source_key     TEXT NOT NULL REFERENCES scrape_source_registry(source_key) ON DELETE CASCADE,
  topic_label    TEXT NOT NULL,
  query_text     TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'general',
  enabled        BOOLEAN NOT NULL DEFAULT true,
  priority       INTEGER NOT NULL DEFAULT 100,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_topic_registry_category_check
    CHECK (category IN ('general', 'price', 'shortage', 'policy', 'commercial')),
  CONSTRAINT scrape_topic_registry_key_length_check
    CHECK (char_length(topic_key) <= 120),
  CONSTRAINT scrape_topic_registry_label_length_check
    CHECK (char_length(topic_label) <= 200),
  CONSTRAINT scrape_topic_registry_query_length_check
    CHECK (char_length(query_text) <= 500),
  CONSTRAINT scrape_topic_registry_priority_check
    CHECK (priority BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS scrape_topic_registry_source_priority_idx
  ON scrape_topic_registry (source_key, enabled, priority);

ALTER TABLE scrape_topic_registry ENABLE ROW LEVEL SECURITY;

INSERT INTO scrape_topic_registry (
  topic_key,
  source_key,
  topic_label,
  query_text,
  category,
  enabled,
  priority,
  metadata
) VALUES
  (
    'news_lpg_shortage_india',
    'google_news_rss',
    'LPG shortage signals',
    'LPG cylinder shortage India',
    'shortage',
    true,
    10,
    '{"intent":"availability"}'::jsonb
  ),
  (
    'news_lpg_price_india',
    'google_news_rss',
    'LPG price revisions',
    'gas cylinder price India 2025',
    'price',
    true,
    20,
    '{"intent":"pricing"}'::jsonb
  ),
  (
    'news_lpg_booking_india',
    'google_news_rss',
    'LPG booking workflow',
    'LPG booking India',
    'policy',
    true,
    30,
    '{"intent":"booking"}'::jsonb
  )
ON CONFLICT (topic_key) DO UPDATE SET
  source_key = EXCLUDED.source_key,
  topic_label = EXCLUDED.topic_label,
  query_text = EXCLUDED.query_text,
  category = EXCLUDED.category,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS scrape_runtime_config (
  config_key    TEXT PRIMARY KEY,
  config_scope  TEXT NOT NULL DEFAULT 'global',
  enabled       BOOLEAN NOT NULL DEFAULT true,
  value_json    JSONB NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_runtime_config_scope_check
    CHECK (config_scope IN ('global', 'price_scraper', 'news_scraper')),
  CONSTRAINT scrape_runtime_config_key_length_check
    CHECK (char_length(config_key) <= 120)
);

CREATE INDEX IF NOT EXISTS scrape_runtime_config_scope_enabled_idx
  ON scrape_runtime_config (config_scope, enabled);

ALTER TABLE scrape_runtime_config ENABLE ROW LEVEL SECURITY;

INSERT INTO scrape_runtime_config (
  config_key,
  config_scope,
  enabled,
  value_json,
  description
) VALUES
  ('news_limit', 'news_scraper', true, '8'::jsonb, 'Maximum number of normalized news items returned to the feed.'),
  ('news_decode_timeout_ms', 'news_scraper', true, '1800'::jsonb, 'Timeout for article URL decode helpers in the news scraper.'),
  ('news_retention_days', 'news_scraper', true, '14'::jsonb, 'Number of days normalized feed rows should be retained before pruning.'),
  ('raw_document_retention_days', 'global', true, '7'::jsonb, 'Default number of days raw scrape payloads should be retained before cleanup.'),
  ('price_fetch_timeout_ms', 'price_scraper', true, '8000'::jsonb, 'Timeout for the upstream city price page request.'),
  ('price_max_concurrency', 'price_scraper', true, '3'::jsonb, 'Default max concurrency for the price scraper.'),
  ('price_request_jitter_ms', 'price_scraper', true, '900'::jsonb, 'Delay inserted between upstream price requests.'),
  ('price_retry_limit', 'price_scraper', true, '1'::jsonb, 'Default retry attempts for transient upstream failures.'),
  ('price_retry_base_delay_ms', 'price_scraper', true, '1400'::jsonb, 'Base backoff delay for price scraper retries.'),
  ('price_source_failover_enabled', 'price_scraper', true, 'true'::jsonb, 'Allow scrape-prices to try the next enabled price source when the current source blocks, times out, or fails.'),
  ('price_capture_blocked_html', 'price_scraper', true, 'true'::jsonb, 'Store blocked price-source HTML in raw_source_documents for debugging when the scraper detects an upstream block.')
ON CONFLICT (config_key) DO UPDATE SET
  config_scope = EXCLUDED.config_scope,
  enabled = EXCLUDED.enabled,
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id            BIGSERIAL PRIMARY KEY,
  job_type      TEXT NOT NULL,
  job_key       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  source_key    TEXT,
  target_key    TEXT,
  trigger_mode  TEXT NOT NULL DEFAULT 'manual',
  payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error    TEXT,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_jobs_type_check
    CHECK (job_type IN ('price_scrape', 'news_scrape')),
  CONSTRAINT scrape_jobs_status_check
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'cancelled')),
  CONSTRAINT scrape_jobs_trigger_mode_check
    CHECK (trigger_mode IN ('manual', 'scheduled', 'fallback'))
);

CREATE INDEX IF NOT EXISTS scrape_jobs_type_status_idx
  ON scrape_jobs (job_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_jobs_source_target_idx
  ON scrape_jobs (source_key, target_key, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_jobs_job_key_idx
  ON scrape_jobs (job_type, job_key, created_at DESC);

CREATE OR REPLACE FUNCTION touch_scrape_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scrape_jobs_set_updated_at
  ON scrape_jobs;

CREATE TRIGGER scrape_jobs_set_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION touch_scrape_job_updated_at();

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS scrape_job_attempts (
  id                 BIGSERIAL PRIMARY KEY,
  job_id             BIGINT NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  attempt_number     INT NOT NULL DEFAULT 1,
  target_key         TEXT,
  status             TEXT NOT NULL DEFAULT 'running',
  request_url        TEXT,
  source_url         TEXT,
  source_host        TEXT,
  http_status        INT,
  latency_ms         INT,
  error_message      TEXT,
  blocked_suspected  BOOLEAN NOT NULL DEFAULT false,
  rate_limited       BOOLEAN NOT NULL DEFAULT false,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_job_attempts_attempt_check
    CHECK (attempt_number >= 1),
  CONSTRAINT scrape_job_attempts_status_check
    CHECK (status IN ('running', 'succeeded', 'failed', 'timeout', 'rate_limited', 'blocked', 'partial')),
  CONSTRAINT scrape_job_attempts_latency_check
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS scrape_job_attempts_job_idx
  ON scrape_job_attempts (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_job_attempts_status_idx
  ON scrape_job_attempts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_job_attempts_source_idx
  ON scrape_job_attempts (source_host, target_key, created_at DESC);

ALTER TABLE scrape_job_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS raw_source_documents (
  id               BIGSERIAL PRIMARY KEY,
  job_id           BIGINT NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  attempt_id       BIGINT REFERENCES scrape_job_attempts(id) ON DELETE SET NULL,
  source_key       TEXT NOT NULL,
  target_key       TEXT,
  document_kind    TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  content_text     TEXT NOT NULL,
  content_hash     TEXT NOT NULL,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_until  TIMESTAMPTZ NOT NULL,
  metadata_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT raw_source_documents_kind_check
    CHECK (document_kind IN ('html', 'rss', 'json'))
);

CREATE INDEX IF NOT EXISTS raw_source_documents_job_idx
  ON raw_source_documents (job_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS raw_source_documents_retention_idx
  ON raw_source_documents (retention_until, fetched_at DESC);

CREATE INDEX IF NOT EXISTS raw_source_documents_source_idx
  ON raw_source_documents (source_key, target_key, fetched_at DESC);

ALTER TABLE raw_source_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW scrape_job_health_v1
WITH (security_invoker = true) AS
SELECT
  job_type,
  source_key,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded_jobs,
  COUNT(*) FILTER (WHERE status = 'partial') AS partial_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_jobs,
  MAX(created_at) AS last_job_created_at,
  MAX(finished_at) AS last_job_finished_at,
  MAX(finished_at) FILTER (WHERE status = 'succeeded') AS last_success_at
FROM scrape_jobs
GROUP BY job_type, source_key;

CREATE OR REPLACE VIEW scrape_source_health_v1
WITH (security_invoker = true) AS
SELECT
  j.job_type,
  j.source_key,
  a.source_host,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE a.status = 'succeeded') AS succeeded_attempts,
  COUNT(*) FILTER (WHERE a.status IN ('failed', 'timeout', 'rate_limited', 'blocked')) AS failed_attempts,
  COUNT(*) FILTER (WHERE a.rate_limited) AS rate_limited_attempts,
  COUNT(*) FILTER (WHERE a.blocked_suspected) AS blocked_attempts,
  MAX(a.finished_at) AS last_attempt_finished_at,
  MAX(a.finished_at) FILTER (WHERE a.status = 'succeeded') AS last_success_at
FROM scrape_job_attempts a
JOIN scrape_jobs j
  ON j.id = a.job_id
GROUP BY j.job_type, j.source_key, a.source_host;

REVOKE ALL ON TABLE scrape_job_health_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE scrape_source_health_v1 FROM PUBLIC, anon, authenticated;

-- ============================================
-- DONE. Now copy your Project URL + anon key
-- into .env.local
-- ============================================
