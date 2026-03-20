-- ============================================
-- CylinderCheck - Canonical PIN profiles
-- Normalizes city/state/area so Track can reason about
-- nearby PINs and all-India lookups more consistently.
-- ============================================

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

CREATE INDEX IF NOT EXISTS pin_profiles_city_idx
  ON public.pin_profiles (canonical_city);

CREATE INDEX IF NOT EXISTS pin_profiles_state_idx
  ON public.pin_profiles (canonical_state);

ALTER TABLE public.pin_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_profiles'
      AND policyname = 'Anyone can read pin profiles'
  ) THEN
    CREATE POLICY "Anyone can read pin profiles"
      ON public.pin_profiles FOR SELECT USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.clean_track_location_label(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      trim(
        regexp_replace(
          regexp_replace(COALESCE(p_value, ''), '[,_]+', ' ', 'g'),
          '\s*-\s*',
          ' - ',
          'g'
        )
      ),
      '\s+',
      ' ',
      'g'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.derive_track_area_label(
  p_raw_value TEXT,
  p_city TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean_value TEXT;
  clean_city TEXT;
  prefix_value TEXT;
BEGIN
  clean_value := public.clean_track_location_label(p_raw_value);
  clean_city := public.clean_track_location_label(p_city);

  IF clean_value IS NULL OR clean_city IS NULL THEN
    RETURN NULL;
  END IF;

  IF lower(clean_value) = lower(clean_city) THEN
    RETURN NULL;
  END IF;

  IF strpos(clean_value, ' - ') > 0 THEN
    IF lower(split_part(clean_value, ' - ', 2)) = lower(clean_city) THEN
      RETURN NULLIF(trim(split_part(clean_value, ' - ', 1)), '');
    END IF;
  END IF;

  IF right(lower(clean_value), length(lower(clean_city))) = lower(clean_city) THEN
    prefix_value := trim(left(clean_value, length(clean_value) - length(clean_city)));
    prefix_value := regexp_replace(prefix_value, '[-,]+$', '', 'g');
    RETURN NULLIF(trim(prefix_value), '');
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_pin_profiles()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH pin_universe AS (
    SELECT pd.pin, pd.city, pd.state, pd.city AS area_hint, 'seed'::TEXT AS source_type, 100 AS source_weight, NULL::TIMESTAMPTZ AS observed_at
    FROM public.pin_data pd
    UNION ALL
    SELECT r.pin, NULLIF(r.city, '') AS city, pd.state, NULLIF(r.city, '') AS area_hint, 'report'::TEXT, 40, MAX(r.created_at)
    FROM public.reports r
    LEFT JOIN public.pin_data pd
      ON pd.pin = r.pin
    WHERE r.pin ~ '^[0-9]{6}$'
      AND r.is_hidden IS NOT TRUE
    GROUP BY r.pin, NULLIF(r.city, ''), pd.state
    UNION ALL
    SELECT pus.pin, NULLIF(pus.city, '') AS city, NULLIF(pus.state, '') AS state, NULLIF(pus.area, '') AS area_hint, 'signal'::TEXT, 30, MAX(pus.created_at)
    FROM public.pin_user_signals pus
    WHERE pus.pin ~ '^[0-9]{6}$'
      AND pus.active = true
    GROUP BY pus.pin, NULLIF(pus.city, ''), NULLIF(pus.state, ''), NULLIF(pus.area, '')
  ),
  cleaned AS (
    SELECT
      pu.pin,
      LEFT(pu.pin, 3) AS pin_prefix3,
      public.clean_track_location_label(pu.city) AS raw_city,
      public.clean_track_location_label(pu.state) AS raw_state,
      public.clean_track_location_label(pu.area_hint) AS raw_area,
      pu.source_type,
      pu.source_weight,
      pu.observed_at
    FROM pin_universe pu
  ),
  prefix_seed AS (
    SELECT
      LEFT(pd.pin, 3) AS pin_prefix3,
      MAX(pd.city) AS fallback_city,
      MAX(pd.state) AS fallback_state
    FROM public.pin_data pd
    GROUP BY LEFT(pd.pin, 3)
  ),
  normalized_candidates AS (
    SELECT
      c.pin,
      c.pin_prefix3,
      CASE
        WHEN c.source_type = 'seed' THEN c.raw_city
        WHEN c.raw_city IS NULL THEN NULL
        WHEN ps.fallback_city IS NOT NULL AND lower(c.raw_city) = lower(ps.fallback_city) THEN ps.fallback_city
        WHEN ps.fallback_city IS NOT NULL AND lower(split_part(c.raw_city, ' - ', 2)) = lower(ps.fallback_city) THEN ps.fallback_city
        WHEN ps.fallback_city IS NOT NULL AND right(lower(c.raw_city), length(lower(ps.fallback_city))) = lower(ps.fallback_city) THEN ps.fallback_city
        ELSE c.raw_city
      END AS city_candidate,
      CASE
        WHEN c.raw_state IS NOT NULL THEN c.raw_state
        WHEN ps.fallback_state IS NOT NULL THEN ps.fallback_state
        ELSE NULL
      END AS state_candidate,
      CASE
        WHEN c.raw_area IS NOT NULL THEN c.raw_area
        ELSE public.derive_track_area_label(c.raw_city, CASE
          WHEN c.source_type = 'seed' THEN c.raw_city
          WHEN ps.fallback_city IS NOT NULL AND lower(c.raw_city) = lower(ps.fallback_city) THEN ps.fallback_city
          WHEN ps.fallback_city IS NOT NULL AND lower(split_part(c.raw_city, ' - ', 2)) = lower(ps.fallback_city) THEN ps.fallback_city
          WHEN ps.fallback_city IS NOT NULL AND right(lower(c.raw_city), length(lower(ps.fallback_city))) = lower(ps.fallback_city) THEN ps.fallback_city
          ELSE c.raw_city
        END)
      END AS area_candidate,
      c.source_type,
      c.source_weight,
      c.observed_at
    FROM cleaned c
    LEFT JOIN prefix_seed ps
      ON ps.pin_prefix3 = c.pin_prefix3
  ),
  best_city AS (
    SELECT DISTINCT ON (pin)
      pin,
      city_candidate,
      CASE
        WHEN source_type = 'seed' THEN 'seed'
        WHEN city_candidate IS NOT NULL AND source_type = 'report' THEN 'report'
        WHEN city_candidate IS NOT NULL AND source_type = 'signal' THEN 'signal'
        ELSE 'unknown'
      END AS city_source
    FROM normalized_candidates
    WHERE city_candidate IS NOT NULL
    ORDER BY pin, source_weight DESC, observed_at DESC NULLS LAST, city_candidate
  ),
  best_state AS (
    SELECT DISTINCT ON (pin)
      pin,
      state_candidate,
      CASE
        WHEN source_type = 'seed' THEN 'seed'
        WHEN state_candidate IS NOT NULL AND source_type = 'report' THEN 'report'
        WHEN state_candidate IS NOT NULL AND source_type = 'signal' THEN 'signal'
        ELSE 'unknown'
      END AS state_source
    FROM normalized_candidates
    WHERE state_candidate IS NOT NULL
    ORDER BY pin, source_weight DESC, observed_at DESC NULLS LAST, state_candidate
  ),
  best_area AS (
    SELECT DISTINCT ON (pin)
      pin,
      area_candidate,
      CASE
        WHEN source_type = 'seed' THEN 'seed'
        WHEN area_candidate IS NOT NULL AND source_type = 'signal' THEN 'signal'
        WHEN area_candidate IS NOT NULL THEN 'derived'
        ELSE 'unknown'
      END AS area_source
    FROM normalized_candidates
    WHERE area_candidate IS NOT NULL
    ORDER BY pin, CASE WHEN source_type = 'signal' THEN 2 WHEN source_type = 'seed' THEN 1 ELSE 0 END DESC, observed_at DESC NULLS LAST, area_candidate
  ),
  per_pin_counts AS (
    SELECT
      nc.pin,
      COUNT(*) FILTER (WHERE nc.source_type = 'seed') AS seed_count,
      COUNT(*) FILTER (WHERE nc.source_type = 'report') AS report_count,
      COUNT(*) FILTER (WHERE nc.source_type = 'signal') AS signal_count,
      MAX(nc.observed_at) FILTER (WHERE nc.source_type = 'report') AS last_report_at,
      MAX(nc.observed_at) FILTER (WHERE nc.source_type = 'signal') AS last_signal_at
    FROM normalized_candidates nc
    GROUP BY nc.pin
  ),
  prefix_defaults AS (
    SELECT
      ps.pin_prefix3,
      ps.fallback_city,
      ps.fallback_state
    FROM prefix_seed ps
  )
  INSERT INTO public.pin_profiles (
    pin,
    canonical_city,
    canonical_state,
    canonical_area,
    city_source,
    state_source,
    area_source,
    profile_confidence,
    last_report_at,
    last_signal_at,
    updated_at
  )
  SELECT
    ppc.pin,
    COALESCE(bc.city_candidate, pd.fallback_city) AS canonical_city,
    COALESCE(bs.state_candidate, pd.fallback_state) AS canonical_state,
    ba.area_candidate AS canonical_area,
    COALESCE(bc.city_source, CASE WHEN pd.fallback_city IS NOT NULL THEN 'prefix_seed' ELSE 'unknown' END) AS city_source,
    COALESCE(bs.state_source, CASE WHEN pd.fallback_state IS NOT NULL THEN 'prefix_seed' ELSE 'unknown' END) AS state_source,
    COALESCE(ba.area_source, 'unknown') AS area_source,
    CASE
      WHEN COALESCE(bc.city_source, '') = 'seed' AND COALESCE(bs.state_source, '') = 'seed' THEN 'high'
      WHEN ppc.report_count >= 2 OR ppc.signal_count >= 2 THEN 'medium'
      WHEN COALESCE(bc.city_candidate, pd.fallback_city) IS NOT NULL THEN 'low'
      ELSE 'low'
    END AS profile_confidence,
    ppc.last_report_at,
    ppc.last_signal_at,
    NOW()
  FROM per_pin_counts ppc
  LEFT JOIN best_city bc
    ON bc.pin = ppc.pin
  LEFT JOIN best_state bs
    ON bs.pin = ppc.pin
  LEFT JOIN best_area ba
    ON ba.pin = ppc.pin
  LEFT JOIN prefix_defaults pd
    ON pd.pin_prefix3 = LEFT(ppc.pin, 3)
  ON CONFLICT (pin) DO UPDATE
  SET
    canonical_city = EXCLUDED.canonical_city,
    canonical_state = EXCLUDED.canonical_state,
    canonical_area = EXCLUDED.canonical_area,
    city_source = EXCLUDED.city_source,
    state_source = EXCLUDED.state_source,
    area_source = EXCLUDED.area_source,
    profile_confidence = EXCLUDED.profile_confidence,
    last_report_at = EXCLUDED.last_report_at,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_pin_neighbor_edges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.pin_neighbor_edges;

  INSERT INTO public.pin_neighbor_edges (
    pin,
    nearby_pin,
    relation_type,
    edge_weight,
    city,
    state,
    active,
    created_at,
    updated_at
  )
  SELECT
    a.pin,
    b.pin,
    CASE
      WHEN a.canonical_city IS NOT NULL
        AND b.canonical_city IS NOT NULL
        AND a.canonical_city = b.canonical_city
        AND a.canonical_area IS NOT NULL
        AND b.canonical_area IS NOT NULL
        AND lower(a.canonical_area) = lower(b.canonical_area) THEN 'same_area_cluster'
      WHEN a.canonical_city IS NOT NULL
        AND b.canonical_city IS NOT NULL
        AND a.canonical_city = b.canonical_city
        AND LEFT(a.pin, 4) = LEFT(b.pin, 4) THEN 'same_subcluster'
      WHEN a.canonical_city IS NOT NULL
        AND b.canonical_city IS NOT NULL
        AND a.canonical_city = b.canonical_city THEN 'same_city'
      ELSE 'same_prefix3'
    END AS relation_type,
    CASE
      WHEN a.canonical_city IS NOT NULL
        AND b.canonical_city IS NOT NULL
        AND a.canonical_city = b.canonical_city
        AND a.canonical_area IS NOT NULL
        AND b.canonical_area IS NOT NULL
        AND lower(a.canonical_area) = lower(b.canonical_area) THEN 0.86
      WHEN a.canonical_city IS NOT NULL
        AND b.canonical_city IS NOT NULL
        AND a.canonical_city = b.canonical_city
        AND LEFT(a.pin, 4) = LEFT(b.pin, 4) THEN 0.68
      WHEN a.canonical_city IS NOT NULL
        AND b.canonical_city IS NOT NULL
        AND a.canonical_city = b.canonical_city THEN 0.42
      ELSE 0.22
    END AS edge_weight,
    COALESCE(a.canonical_city, b.canonical_city) AS city,
    COALESCE(a.canonical_state, b.canonical_state) AS state,
    true,
    NOW(),
    NOW()
  FROM public.pin_profiles a
  JOIN public.pin_profiles b
    ON a.pin <> b.pin
   AND (
     (a.canonical_city IS NOT NULL AND b.canonical_city IS NOT NULL AND a.canonical_city = b.canonical_city)
     OR a.pin_prefix3 = b.pin_prefix3
   );
END;
$$;

DROP VIEW IF EXISTS public.pin_track_summary_v1;

CREATE VIEW public.pin_track_summary_v1 AS
SELECT
  pp.pin,
  COALESCE(pdc.city, pp.canonical_city, pd.city) AS city,
  COALESCE(pdc.state, pp.canonical_state, pd.state) AS state,
  pp.canonical_area AS area,
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
FROM public.pin_profiles pp
LEFT JOIN public.pin_data pd
  ON pd.pin = pp.pin
LEFT JOIN public.pin_delivery_confidence pdc
  ON pdc.pin = pp.pin
LEFT JOIN public.pin_supply_pressure psp
  ON psp.pin = pp.pin
LEFT JOIN public.pin_distributor_coverage coverage
  ON coverage.pin = pp.pin
  AND coverage.is_primary = true
  AND coverage.active = true
LEFT JOIN public.distributors d
  ON d.id = coverage.distributor_id
  AND d.active = true;
