-- ============================================
-- CylinderCheck - City registry SEO access
-- Date: 2026-03-29
-- Purpose:
--   1. Allow public reads of SEO-enabled city registry rows only.
--   2. Extend news scraper runtime config with a retention-days key.
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
    'news_retention_days',
    'news_scraper',
    true,
    '14'::jsonb,
    'Number of days normalized feed rows should be retained before pruning.'
  )
ON CONFLICT (config_key) DO UPDATE SET
  config_scope = EXCLUDED.config_scope,
  enabled = EXCLUDED.enabled,
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  updated_at = NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'city_registry'
      AND policyname = 'Anyone can read SEO-enabled cities'
  ) THEN
    CREATE POLICY "Anyone can read SEO-enabled cities"
      ON public.city_registry
      FOR SELECT
      USING (
        household_seo_enabled = true
        OR commercial_seo_enabled = true
      );
  END IF;
END $$;

COMMIT;
