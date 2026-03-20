-- ============================================
-- CylinderCheck - Track signal propagation columns
-- Adds source + signal-count fields to confidence snapshots
-- and refreshes the compatibility view.
-- ============================================

ALTER TABLE public.pin_delivery_confidence
  ADD COLUMN IF NOT EXISTS exact_signal_count_30d INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nearby_signal_count_30d INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_scope TEXT NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pin_delivery_confidence_source_scope_check'
  ) THEN
    ALTER TABLE public.pin_delivery_confidence
      ADD CONSTRAINT pin_delivery_confidence_source_scope_check
      CHECK (source_scope IN ('none', 'historical', 'nearby', 'local'));
  END IF;
END $$;

ALTER TABLE public.pin_supply_pressure
  ADD COLUMN IF NOT EXISTS exact_signal_count_30d INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nearby_signal_count_30d INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_scope TEXT NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pin_supply_pressure_source_scope_check'
  ) THEN
    ALTER TABLE public.pin_supply_pressure
      ADD CONSTRAINT pin_supply_pressure_source_scope_check
      CHECK (source_scope IN ('none', 'nearby', 'local', 'mixed'));
  END IF;
END $$;

CREATE OR REPLACE VIEW public.pin_track_summary_v1 AS
SELECT
  pd.pin,
  COALESCE(pdc.city, pd.city) AS city,
  COALESCE(pdc.state, pd.state) AS state,
  pdc.sample_size_7d,
  pdc.sample_size_30d,
  pdc.delivery_days_p25,
  pdc.delivery_days_median,
  pdc.delivery_days_p75,
  pdc.historical_avg_days,
  pdc.confidence_level AS delivery_confidence_level,
  pdc.freshness_status AS delivery_freshness_status,
  pdc.last_observed_at,
  pdc.source_scope AS delivery_source_scope,
  pdc.exact_signal_count_30d AS delivery_exact_signal_count_30d,
  pdc.nearby_signal_count_30d AS delivery_nearby_signal_count_30d,
  psp.report_count_7d,
  psp.report_count_30d,
  psp.trend_direction,
  psp.pressure_score,
  psp.pressure_level,
  psp.last_report_at,
  psp.source_scope AS pressure_source_scope,
  psp.exact_signal_count_30d AS pressure_exact_signal_count_30d,
  psp.nearby_signal_count_30d AS pressure_nearby_signal_count_30d,
  d.id AS distributor_id,
  d.company AS distributor_company,
  d.display_name AS distributor_name,
  d.verification_status AS distributor_verification_status,
  d.last_verified_at AS distributor_last_verified_at
FROM public.pin_data pd
LEFT JOIN public.pin_delivery_confidence pdc
  ON pdc.pin = pd.pin
LEFT JOIN public.pin_supply_pressure psp
  ON psp.pin = pd.pin
LEFT JOIN public.pin_distributor_coverage coverage
  ON coverage.pin = pd.pin
  AND coverage.is_primary = true
  AND coverage.active = true
LEFT JOIN public.distributors d
  ON d.id = coverage.distributor_id
  AND d.active = true;
