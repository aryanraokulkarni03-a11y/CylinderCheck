-- ============================================
-- CylinderCheck - Unified View Split Patch
-- Date: 2026-03-25
-- Fixes: Duplication collisions bridging commercial/domestic PIN splits.
-- ============================================

BEGIN;

-- 1. Initialize standalone schemas if completely missing (e.g. fresh DB wipes)
CREATE TABLE IF NOT EXISTS public.pin_delivery_confidence (
  pin                   TEXT NOT NULL,
  city                  TEXT,
  state                 TEXT,
  sample_size_7d        INT NOT NULL DEFAULT 0,
  sample_size_30d       INT NOT NULL DEFAULT 0,
  delivery_days_p25     NUMERIC(4,1),
  delivery_days_median  NUMERIC(4,1),
  delivery_days_p75     NUMERIC(4,1),
  historical_avg_days   NUMERIC(4,1),
  confidence_level      TEXT NOT NULL DEFAULT 'limited',
  freshness_status      TEXT NOT NULL DEFAULT 'stale',
  source_scope          TEXT NOT NULL DEFAULT 'none',
  exact_signal_count_30d INT NOT NULL DEFAULT 0,
  nearby_signal_count_30d INT NOT NULL DEFAULT 0,
  last_observed_at      TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_delivery_confidence_pin_check CHECK (pin ~ '^[0-9]{6}$')
);

CREATE TABLE IF NOT EXISTS public.pin_supply_pressure (
  pin                TEXT NOT NULL,
  city               TEXT,
  state              TEXT,
  report_count_7d    INT NOT NULL DEFAULT 0,
  report_count_30d   INT NOT NULL DEFAULT 0,
  trend_direction    TEXT NOT NULL DEFAULT 'steady',
  pressure_score     INT NOT NULL DEFAULT 0,
  pressure_level     TEXT NOT NULL DEFAULT 'limited',
  source_scope       TEXT NOT NULL DEFAULT 'none',
  exact_signal_count_30d INT NOT NULL DEFAULT 0,
  nearby_signal_count_30d INT NOT NULL DEFAULT 0,
  last_report_at     TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_supply_pressure_pin_check CHECK (pin ~ '^[0-9]{6}$')
);

CREATE TABLE IF NOT EXISTS public.pin_profiles (
  pin                 TEXT PRIMARY KEY,
  pin_prefix3         TEXT GENERATED ALWAYS AS (left(pin, 3)) STORED,
  canonical_city      TEXT,
  canonical_state     TEXT,
  canonical_area      TEXT,
  city_source         TEXT NOT NULL DEFAULT 'unknown',
  state_source        TEXT NOT NULL DEFAULT 'unknown',
  area_source         TEXT NOT NULL DEFAULT 'unknown',
  profile_confidence  TEXT NOT NULL DEFAULT 'low',
  last_report_at      TIMESTAMPTZ,
  last_signal_at      TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_profiles_pin_check CHECK (pin ~ '^[0-9]{6}$')
);

-- 2. Guard against partial environments.
-- This migration depends on the real core schema already existing. Do not
-- fabricate simplified stand-ins here, because that leaves Track looking
-- deployed while other product flows still break.
DO $$
BEGIN
  IF to_regclass('public.pin_data') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_data. Apply the base schema before running 2026-03-25_upgrade-track-summary-view.sql.';
  END IF;

  IF to_regclass('public.reports') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.reports. Apply the base schema before running 2026-03-25_upgrade-track-summary-view.sql.';
  END IF;

  IF to_regclass('public.pin_user_signals') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_user_signals. Apply the base schema before running 2026-03-25_upgrade-track-summary-view.sql.';
  END IF;

  IF to_regclass('public.distributors') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.distributors. Apply the base schema before running 2026-03-25_upgrade-track-summary-view.sql.';
  END IF;

  IF to_regclass('public.pin_distributor_coverage') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_distributor_coverage. Apply the base schema before running 2026-03-25_upgrade-track-summary-view.sql.';
  END IF;
END $$;

-- 3. Structurally append product_type to ensure schema parity
ALTER TABLE public.pin_supply_pressure 
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg';
ALTER TABLE public.pin_delivery_confidence 
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg';

-- Upgrade Primary Keys to composite (pin, product_type) to support split tracking safely
ALTER TABLE public.pin_supply_pressure DROP CONSTRAINT IF EXISTS pin_supply_pressure_pkey;
DO $$ BEGIN
  ALTER TABLE public.pin_supply_pressure ADD PRIMARY KEY (pin, product_type);
EXCEPTION WHEN OTHERS THEN END $$;

ALTER TABLE public.pin_delivery_confidence DROP CONSTRAINT IF EXISTS pin_delivery_confidence_pkey;
DO $$ BEGIN
  ALTER TABLE public.pin_delivery_confidence ADD PRIMARY KEY (pin, product_type);
EXCEPTION WHEN OTHERS THEN END $$;

-- Safely drop dependencies (if required) or drop directly.
DROP VIEW IF EXISTS public.pin_track_summary_v1;

-- 2. Re-architect the View to compute permutations per PIN.
CREATE VIEW public.pin_track_summary_v1 AS
WITH pin_universe AS (
  SELECT
    pp.pin,
    pp.canonical_city AS city,
    pp.canonical_state AS state,
    pp.canonical_area AS area
  FROM public.pin_profiles pp
  WHERE pp.pin ~ '^[0-9]{6}$'
  UNION
  SELECT
    pd.pin,
    pd.city,
    pd.state,
    pd.area_name AS area
  FROM public.pin_data pd
  WHERE pd.pin ~ '^[0-9]{6}$'
  UNION
  SELECT DISTINCT
    r.pin,
    COALESCE(NULLIF(r.city, ''), pp.canonical_city, pd.city) AS city,
    COALESCE(NULLIF(r.state, ''), pp.canonical_state, pd.state, '') AS state,
    COALESCE(pp.canonical_area, pd.area_name, '') AS area
  FROM public.reports r
  LEFT JOIN public.pin_profiles pp
    ON pp.pin = r.pin
  LEFT JOIN public.pin_data pd
    ON pd.pin = r.pin
  WHERE r.pin ~ '^[0-9]{6}$'
  UNION
  SELECT DISTINCT
    pus.pin,
    COALESCE(NULLIF(pus.city, ''), pp.canonical_city, pd.city) AS city,
    COALESCE(NULLIF(pus.state, ''), pp.canonical_state, pd.state, '') AS state,
    COALESCE(NULLIF(pus.area, ''), pp.canonical_area, pd.area_name, '') AS area
  FROM public.pin_user_signals pus
  LEFT JOIN public.pin_profiles pp
    ON pp.pin = pus.pin
  LEFT JOIN public.pin_data pd
    ON pd.pin = pus.pin
  WHERE pus.pin ~ '^[0-9]{6}$'
  UNION
  SELECT DISTINCT
    pdc.pin,
    COALESCE(NULLIF(pdc.city, ''), pp.canonical_city, '') AS city,
    COALESCE(NULLIF(pdc.state, ''), pp.canonical_state, '') AS state,
    COALESCE(pp.canonical_area, '') AS area
  FROM public.pin_delivery_confidence pdc
  LEFT JOIN public.pin_profiles pp
    ON pp.pin = pdc.pin
  WHERE pdc.pin ~ '^[0-9]{6}$'
  UNION
  SELECT DISTINCT
    psp.pin,
    COALESCE(NULLIF(psp.city, ''), pp.canonical_city, '') AS city,
    COALESCE(NULLIF(psp.state, ''), pp.canonical_state, '') AS state,
    COALESCE(pp.canonical_area, '') AS area
  FROM public.pin_supply_pressure psp
  LEFT JOIN public.pin_profiles pp
    ON pp.pin = psp.pin
  WHERE psp.pin ~ '^[0-9]{6}$'
),
product_types AS (
  SELECT unnest(ARRAY['domestic_14_2kg', 'commercial_19kg']) AS product_type
)
SELECT
  pu.pin,
  COALESCE(NULLIF(pdc.city, ''), NULLIF(psp.city, ''), pu.city) AS city,
  COALESCE(NULLIF(pdc.state, ''), NULLIF(psp.state, ''), pu.state) AS state,
  pu.area AS area,

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
