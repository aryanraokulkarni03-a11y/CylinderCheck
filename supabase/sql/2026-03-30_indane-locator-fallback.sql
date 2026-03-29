-- ============================================
-- CylinderCheck - Indane locator fallback source
-- Date: 2026-03-30
-- Purpose:
--   1. Add an official secondary price source for scrape-prices.
--   2. Keep the first rollout tightly controlled through approved city URLs.
--   3. Start with publish disabled so fallback can be validated safely.
-- ============================================

BEGIN;

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
) VALUES (
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
    "parser_mode": "indane_locator_products",
    "city_url_map": {
      "bangalore": [
        "https://locator.iocl.com/indane/indane-himu-distrubutors-gas-agency-basaveswara-nagar-bengaluru-209876/Home"
      ],
      "mumbai": [
        "https://locator.iocl.com/indane/indane-khara-natural-resources-gas-agency-goregaon-east-mumbai-296697/Home"
      ],
      "new-delhi": [
        "https://locator.iocl.com/indane/indane-d-s-gas-service-gas-agency-budh-vihar-new-delhi-123579/Home"
      ],
      "pune": [
        "https://locator.iocl.com/indane/indane-cme-gas-agency-gas-agency-dapodi-pune-296222/Home"
      ],
      "hyderabad": [
        "https://locator.iocl.com/indane/indane-jaykay-gas-service-gas-agency-habsiguda-hyderabad-212714/Home"
      ]
    },
    "product_labels": {
      "domestic_14_2kg": [
        "Indane 14.2 kg Domestic Cylinder"
      ],
      "commercial_19kg": [
        "Indane 19kg XtraTeJ Cylinder",
        "Indane 19kg Non-Domestic Cylinder",
        "Indane 19 kg"
      ]
    }
  }'::jsonb
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

COMMIT;
