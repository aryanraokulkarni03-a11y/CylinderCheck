-- ============================================
-- CylinderCheck - Price source resilience
-- Date: 2026-03-30
-- Purpose:
--   1. Add runtime knobs for source failover and blocked-payload capture.
--   2. Keep fallback and blocked-debug behavior database-managed.
-- ============================================

BEGIN;

INSERT INTO public.scrape_runtime_config (
  config_key,
  config_scope,
  enabled,
  value_json,
  description
) VALUES
  (
    'price_source_failover_enabled',
    'price_scraper',
    true,
    'true'::jsonb,
    'Allow scrape-prices to try the next enabled price source when the current source blocks, times out, or fails.'
  ),
  (
    'price_capture_blocked_html',
    'price_scraper',
    true,
    'true'::jsonb,
    'Store blocked price-source HTML in raw_source_documents for debugging when the scraper detects an upstream block.'
  )
ON CONFLICT (config_key) DO UPDATE SET
  config_scope = EXCLUDED.config_scope,
  enabled = EXCLUDED.enabled,
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  updated_at = NOW();

COMMIT;
