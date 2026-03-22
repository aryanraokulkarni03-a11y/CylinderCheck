-- ============================================
-- CylinderCheck — PIN Profiles Area Persistence Fix
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Redefine refresh_pin_profiles() so it NEVER overwrites
--    a canonical_area that was manually seeded (area_source = 'seed').
--    Before this fix, running refresh_track_confidence_snapshots() 
--    would wipe out our manual DRL area labels and derive them from city names instead.

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
    canonical_city = CASE WHEN public.pin_profiles.city_source = 'seed' THEN public.pin_profiles.canonical_city ELSE EXCLUDED.canonical_city END,
    canonical_state = CASE WHEN public.pin_profiles.state_source = 'seed' THEN public.pin_profiles.canonical_state ELSE EXCLUDED.canonical_state END,
    canonical_area = CASE WHEN public.pin_profiles.area_source = 'seed' THEN public.pin_profiles.canonical_area ELSE EXCLUDED.canonical_area END,
    city_source = CASE WHEN public.pin_profiles.city_source = 'seed' THEN 'seed' ELSE EXCLUDED.city_source END,
    state_source = CASE WHEN public.pin_profiles.state_source = 'seed' THEN 'seed' ELSE EXCLUDED.state_source END,
    area_source = CASE WHEN public.pin_profiles.area_source = 'seed' THEN 'seed' ELSE EXCLUDED.area_source END,
    profile_confidence = CASE WHEN public.pin_profiles.city_source = 'seed' THEN public.pin_profiles.profile_confidence ELSE EXCLUDED.profile_confidence END,
    last_report_at = EXCLUDED.last_report_at,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Restore the 17 PIN areas from the community intelligence seed that got wiped
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.pin_profiles (
  pin, canonical_city, canonical_state, canonical_area,
  city_source, state_source, area_source, profile_confidence, updated_at
) VALUES
  ('700091', 'Kolkata', 'West Bengal', 'Salt Lake Sector V', 'seed', 'seed', 'seed', 'high', NOW()),
  ('700156', 'Kolkata', 'West Bengal', 'New Town', 'seed', 'seed', 'seed', 'high', NOW()),
  ('700019', 'Kolkata', 'West Bengal', 'Ballygunge', 'seed', 'seed', 'seed', 'high', NOW()),
  ('700032', 'Kolkata', 'West Bengal', 'Jadavpur', 'seed', 'seed', 'seed', 'high', NOW()),
  ('411038', 'Pune', 'Maharashtra', 'Kothrud', 'seed', 'seed', 'seed', 'high', NOW()),
  ('411028', 'Pune', 'Maharashtra', 'Hadapsar', 'seed', 'seed', 'seed', 'high', NOW()),
  ('411045', 'Pune', 'Maharashtra', 'Baner', 'seed', 'seed', 'seed', 'high', NOW()),
  ('411057', 'Pune', 'Maharashtra', 'Wakad', 'seed', 'seed', 'seed', 'high', NOW()),
  ('411027', 'Pune', 'Maharashtra', 'Sangvi', 'seed', 'seed', 'seed', 'high', NOW()),
  ('302017', 'Jaipur', 'Rajasthan', 'Jagatpura', 'seed', 'seed', 'seed', 'high', NOW()),
  ('302021', 'Jaipur', 'Rajasthan', 'Vaishali Nagar', 'seed', 'seed', 'seed', 'high', NOW()),
  ('302020', 'Jaipur', 'Rajasthan', 'Mansarovar', 'seed', 'seed', 'seed', 'high', NOW()),
  ('560102', 'Bengaluru', 'Karnataka', 'HSR Layout', 'seed', 'seed', 'seed', 'high', NOW()),
  ('560038', 'Bengaluru', 'Karnataka', 'Indiranagar', 'seed', 'seed', 'seed', 'high', NOW()),
  ('560066', 'Bengaluru', 'Karnataka', 'Whitefield', 'seed', 'seed', 'seed', 'high', NOW()),
  ('560064', 'Bengaluru', 'Karnataka', 'Yelahanka', 'seed', 'seed', 'seed', 'high', NOW()),
  ('226006', 'Lucknow', 'Uttar Pradesh', 'Nishatganj', 'seed', 'seed', 'seed', 'high', NOW())
ON CONFLICT (pin) DO UPDATE SET
  canonical_city = EXCLUDED.canonical_city,
  canonical_state = EXCLUDED.canonical_state,
  canonical_area = EXCLUDED.canonical_area,
  city_source = EXCLUDED.city_source,
  state_source = EXCLUDED.state_source,
  area_source = EXCLUDED.area_source,
  profile_confidence = EXCLUDED.profile_confidence,
  updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERY (Uncomment to verify)
-- SELECT pin, canonical_city, canonical_area, area_source FROM public.pin_profiles WHERE area_source = 'seed';
-- ─────────────────────────────────────────────────────────────────────────────
