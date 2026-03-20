-- ============================================
-- CylinderCheck - Track confidence + distributor model
-- Draft migration for a stronger Track data model.
--
-- Goals:
-- 1. Stop overloading pin_data with guessed agency + single avg_days.
-- 2. Add a verification layer for distributor mapping.
-- 3. Store delivery confidence snapshots separately from raw reports.
-- 4. Keep legacy pin_data intact during rollout.
-- ============================================

-- 1) Verified distributor directory
CREATE TABLE IF NOT EXISTS public.distributors (
  id                  BIGSERIAL PRIMARY KEY,
  company             TEXT NOT NULL,
  display_name        TEXT NOT NULL,
  service_phone       TEXT,
  support_phone       TEXT,
  website_url         TEXT,
  source_type         TEXT NOT NULL DEFAULT 'official',
  source_url          TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verification_notes  TEXT,
  last_verified_at    TIMESTAMPTZ,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT distributors_company_check
    CHECK (company IN ('IndianOil', 'HP Gas', 'Bharat Gas')),
  CONSTRAINT distributors_verification_status_check
    CHECK (verification_status IN ('unverified', 'likely', 'verified', 'stale'))
);

CREATE INDEX IF NOT EXISTS distributors_company_idx
  ON public.distributors (company);

CREATE INDEX IF NOT EXISTS distributors_verification_status_idx
  ON public.distributors (verification_status);

-- 2) PIN-to-distributor coverage map
-- One PIN can have more than one possible distributor, but only one primary verified row.
CREATE TABLE IF NOT EXISTS public.pin_distributor_coverage (
  id                 BIGSERIAL PRIMARY KEY,
  pin                TEXT NOT NULL,
  distributor_id     BIGINT NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
  coverage_type      TEXT NOT NULL DEFAULT 'exact_pin',
  confidence_level   TEXT NOT NULL DEFAULT 'low',
  source_type        TEXT NOT NULL DEFAULT 'official',
  source_url         TEXT,
  is_primary         BOOLEAN NOT NULL DEFAULT false,
  last_verified_at   TIMESTAMPTZ,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_distributor_coverage_pin_check
    CHECK (pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_distributor_coverage_type_check
    CHECK (coverage_type IN ('exact_pin', 'pin_cluster', 'district')),
  CONSTRAINT pin_distributor_coverage_confidence_check
    CHECK (confidence_level IN ('low', 'medium', 'high')),
  CONSTRAINT pin_distributor_coverage_source_check
    CHECK (source_type IN ('official', 'community_confirmed', 'manual'))
);

CREATE UNIQUE INDEX IF NOT EXISTS pin_distributor_primary_unique
  ON public.pin_distributor_coverage (pin)
  WHERE is_primary = true AND active = true;

CREATE INDEX IF NOT EXISTS pin_distributor_coverage_pin_idx
  ON public.pin_distributor_coverage (pin);

CREATE INDEX IF NOT EXISTS pin_distributor_coverage_distributor_idx
  ON public.pin_distributor_coverage (distributor_id);

-- 3) Delivery confidence snapshot by PIN
-- This stores the derived planning signal, not the raw reports themselves.
CREATE TABLE IF NOT EXISTS public.pin_delivery_confidence (
  pin                   TEXT PRIMARY KEY,
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
  last_observed_at      TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_delivery_confidence_pin_check
    CHECK (pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_delivery_confidence_level_check
    CHECK (confidence_level IN ('limited', 'low', 'medium', 'high')),
  CONSTRAINT pin_delivery_confidence_freshness_check
    CHECK (freshness_status IN ('fresh', 'aging', 'stale'))
);

-- 4) Supply pressure snapshot by PIN
CREATE TABLE IF NOT EXISTS public.pin_supply_pressure (
  pin                TEXT PRIMARY KEY,
  city               TEXT,
  state              TEXT,
  report_count_7d    INT NOT NULL DEFAULT 0,
  report_count_30d   INT NOT NULL DEFAULT 0,
  trend_direction    TEXT NOT NULL DEFAULT 'steady',
  pressure_score     INT NOT NULL DEFAULT 0,
  pressure_level     TEXT NOT NULL DEFAULT 'limited',
  last_report_at     TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_supply_pressure_pin_check
    CHECK (pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_supply_pressure_trend_check
    CHECK (trend_direction IN ('easing', 'steady', 'rising')),
  CONSTRAINT pin_supply_pressure_level_check
    CHECK (pressure_level IN ('limited', 'low', 'building', 'active', 'severe'))
);

-- 5) Compatibility view for Track reads
-- This lets the frontend fetch a cleaner joined shape without dropping legacy pin_data yet.
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
  psp.report_count_7d,
  psp.report_count_30d,
  psp.trend_direction,
  psp.pressure_score,
  psp.pressure_level,
  psp.last_report_at,
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

-- 6) Read policies
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_distributor_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_delivery_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_supply_pressure ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'distributors'
      AND policyname = 'Anyone can read distributors'
  ) THEN
    CREATE POLICY "Anyone can read distributors"
      ON public.distributors FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_distributor_coverage'
      AND policyname = 'Anyone can read pin distributor coverage'
  ) THEN
    CREATE POLICY "Anyone can read pin distributor coverage"
      ON public.pin_distributor_coverage FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_delivery_confidence'
      AND policyname = 'Anyone can read pin delivery confidence'
  ) THEN
    CREATE POLICY "Anyone can read pin delivery confidence"
      ON public.pin_delivery_confidence FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_supply_pressure'
      AND policyname = 'Anyone can read pin supply pressure'
  ) THEN
    CREATE POLICY "Anyone can read pin supply pressure"
      ON public.pin_supply_pressure FOR SELECT USING (true);
  END IF;
END $$;

-- Rollout notes:
-- - Do not drop public.pin_data.agency, avg_days, shortage, or trend yet.
-- - Backfill p25/median/p75 + pressure snapshots from reports first.
-- - Only show distributor info in UI when distributor_verification_status = 'verified'.
