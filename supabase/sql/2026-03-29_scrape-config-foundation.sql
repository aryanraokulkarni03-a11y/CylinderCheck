-- ============================================
-- CylinderCheck - Scrape config foundation
-- Date: 2026-03-29
-- Purpose:
--   1. Move scraper/news city, source, topic, and runtime config into repo-managed SQL.
--   2. Seed the current canonical defaults used by price and news workflows.
--   3. Prepare the backend for queue-backed 3E ingestion without changing public behavior yet.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.city_registry (
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
  ON public.city_registry (display_priority, city_name);

CREATE INDEX IF NOT EXISTS city_registry_surface_flags_idx
  ON public.city_registry (
    household_seo_enabled,
    commercial_seo_enabled,
    price_scrape_enabled,
    news_enabled
  );

ALTER TABLE public.city_registry ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scrape_source_registry (
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
  ON public.scrape_source_registry (source_kind, enabled, priority);

ALTER TABLE public.scrape_source_registry ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scrape_topic_registry (
  id             BIGSERIAL PRIMARY KEY,
  topic_key      TEXT NOT NULL UNIQUE,
  source_key     TEXT NOT NULL REFERENCES public.scrape_source_registry(source_key) ON DELETE CASCADE,
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
  ON public.scrape_topic_registry (source_key, enabled, priority);

ALTER TABLE public.scrape_topic_registry ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scrape_runtime_config (
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
  ON public.scrape_runtime_config (config_scope, enabled);

ALTER TABLE public.scrape_runtime_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.city_registry (
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

INSERT INTO public.scrape_source_registry (
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

INSERT INTO public.scrape_topic_registry (
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

INSERT INTO public.scrape_runtime_config (
  config_key,
  config_scope,
  enabled,
  value_json,
  description
) VALUES
  ('news_limit', 'news_scraper', true, '8'::jsonb, 'Maximum number of normalized news items returned to the feed.'),
  ('news_decode_timeout_ms', 'news_scraper', true, '1800'::jsonb, 'Timeout for article URL decode helpers in the news scraper.'),
  ('price_fetch_timeout_ms', 'price_scraper', true, '8000'::jsonb, 'Timeout for the upstream city price page request.'),
  ('price_max_concurrency', 'price_scraper', true, '3'::jsonb, 'Default max concurrency for the price scraper.'),
  ('price_request_jitter_ms', 'price_scraper', true, '900'::jsonb, 'Delay inserted between upstream price requests.'),
  ('price_retry_limit', 'price_scraper', true, '1'::jsonb, 'Default retry attempts for transient upstream failures.'),
  ('price_retry_base_delay_ms', 'price_scraper', true, '1400'::jsonb, 'Base backoff delay for price scraper retries.')
ON CONFLICT (config_key) DO UPDATE SET
  config_scope = EXCLUDED.config_scope,
  enabled = EXCLUDED.enabled,
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  updated_at = NOW();

COMMIT;
