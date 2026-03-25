-- ============================================
-- CylinderCheck - Unified View Split Patch
-- Date: 2026-03-25
-- Fixes: Duplication collisions bridging commercial/domestic PIN splits.
-- ============================================

BEGIN;

-- 1. Structurally append product_type to ensure schema parity.
ALTER TABLE public.pin_supply_pressure 
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg';
ALTER TABLE public.pin_delivery_confidence 
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg';

-- Upgrade Primary Keys to composite (pin, product_type) to support split tracking
ALTER TABLE public.pin_supply_pressure DROP CONSTRAINT IF EXISTS pin_supply_pressure_pkey;
ALTER TABLE public.pin_supply_pressure ADD PRIMARY KEY (pin, product_type);

ALTER TABLE public.pin_delivery_confidence DROP CONSTRAINT IF EXISTS pin_delivery_confidence_pkey;
ALTER TABLE public.pin_delivery_confidence ADD PRIMARY KEY (pin, product_type);

-- Safely drop dependencies (if required) or drop directly.
DROP VIEW IF EXISTS public.pin_track_summary_v1;

-- 2. Re-architect the View to compute permutations per PIN.
CREATE VIEW public.pin_track_summary_v1 AS
WITH pin_universe AS (
  SELECT pd.pin, pd.city, pd.state
  FROM public.pin_data pd
  UNION
  SELECT DISTINCT
    r.pin,
    COALESCE(NULLIF(r.city, ''), pd.city) AS city,
    COALESCE(pd.state, '') AS state
  FROM public.reports r
  LEFT JOIN public.pin_data pd
    ON pd.pin = r.pin
  WHERE r.pin ~ '^[0-9]{6}$'
  UNION
  SELECT DISTINCT
    pus.pin,
    COALESCE(NULLIF(pus.city, ''), pd.city) AS city,
    COALESCE(NULLIF(pus.state, ''), pd.state, '') AS state
  FROM public.pin_user_signals pus
  LEFT JOIN public.pin_data pd
    ON pd.pin = pus.pin
  WHERE pus.pin ~ '^[0-9]{6}$'
),
product_types AS (
  SELECT unnest(ARRAY['domestic_14_2kg', 'commercial_19kg']) AS product_type
)
SELECT
  pu.pin,
  COALESCE(pdc.city, pu.city) AS city,
  COALESCE(pdc.state, pu.state) AS state,

  -- We unify the product_type output
  pt.product_type AS pressure_product_type,
  pt.product_type AS delivery_product_type,

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
FROM pin_universe pu
CROSS JOIN product_types pt
LEFT JOIN public.pin_delivery_confidence pdc
  ON pdc.pin = pu.pin AND pdc.product_type = pt.product_type
LEFT JOIN public.pin_supply_pressure psp
  ON psp.pin = pu.pin AND psp.product_type = pt.product_type
LEFT JOIN public.pin_distributor_coverage coverage
  ON coverage.pin = pu.pin
  AND coverage.is_primary = true
  AND coverage.active = true
LEFT JOIN public.distributors d
  ON d.id = coverage.distributor_id
  AND d.active = true
WHERE pdc.pin IS NOT NULL OR psp.pin IS NOT NULL OR pt.product_type = 'domestic_14_2kg';
-- Ensure we always return at least the domestic mapping for bare pins.

COMMIT;
