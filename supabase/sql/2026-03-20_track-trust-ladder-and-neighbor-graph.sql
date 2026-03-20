-- ============================================
-- CylinderCheck - Track trust ladder + neighbor graph
-- Adds contributor trust profiles, safer insert guardrails,
-- and a reusable nearby-PIN graph for Track confidence.
-- ============================================

CREATE TABLE IF NOT EXISTS public.pin_contributor_profiles (
  user_id                   UUID PRIMARY KEY,
  home_pin                  TEXT,
  home_city                 TEXT,
  home_state                TEXT,
  manual_verification_tier  TEXT NOT NULL DEFAULT 'none',
  trust_tier                TEXT NOT NULL DEFAULT 'signed_in_user',
  source_weight             NUMERIC(4,2) NOT NULL DEFAULT 0.55,
  reputation_score          INT NOT NULL DEFAULT 0,
  signal_count_90d          INT NOT NULL DEFAULT 0,
  corroborated_count_90d    INT NOT NULL DEFAULT 0,
  distinct_pin_count_90d    INT NOT NULL DEFAULT 0,
  last_signal_at            TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_contributor_profiles_home_pin_check
    CHECK (home_pin IS NULL OR home_pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_contributor_profiles_manual_tier_check
    CHECK (manual_verification_tier IN ('none', 'trusted_contributor', 'verified_local_contributor')),
  CONSTRAINT pin_contributor_profiles_trust_tier_check
    CHECK (trust_tier IN ('signed_in_user', 'repeat_local_contributor', 'trusted_contributor', 'verified_local_contributor'))
);

ALTER TABLE public.pin_user_signals
  ALTER COLUMN trust_tier SET DEFAULT 'signed_in_user',
  ALTER COLUMN source_weight SET DEFAULT 0.55;

CREATE INDEX IF NOT EXISTS pin_contributor_profiles_trust_tier_idx
  ON public.pin_contributor_profiles (trust_tier);

CREATE TABLE IF NOT EXISTS public.pin_neighbor_edges (
  pin              TEXT NOT NULL,
  nearby_pin       TEXT NOT NULL,
  relation_type    TEXT NOT NULL,
  edge_weight      NUMERIC(4,2) NOT NULL,
  city             TEXT,
  state            TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pin, nearby_pin),
  CONSTRAINT pin_neighbor_edges_pin_check
    CHECK (pin ~ '^[0-9]{6}$' AND nearby_pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_neighbor_edges_relation_check
    CHECK (relation_type IN ('same_area_cluster', 'same_subcluster', 'same_city', 'same_prefix3')),
  CONSTRAINT pin_neighbor_edges_weight_check
    CHECK (edge_weight > 0 AND edge_weight <= 1),
  CONSTRAINT pin_neighbor_edges_no_self_check
    CHECK (pin <> nearby_pin)
);

CREATE INDEX IF NOT EXISTS pin_neighbor_edges_nearby_pin_idx
  ON public.pin_neighbor_edges (nearby_pin);

CREATE INDEX IF NOT EXISTS pin_neighbor_edges_active_idx
  ON public.pin_neighbor_edges (active, relation_type);

ALTER TABLE public.pin_contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_neighbor_edges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_neighbor_edges'
      AND policyname = 'Anyone can read pin neighbor edges'
  ) THEN
    CREATE POLICY "Anyone can read pin neighbor edges"
      ON public.pin_neighbor_edges FOR SELECT USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.compute_track_source_weight(
  p_trust_tier TEXT,
  p_reputation_score INT DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_weight NUMERIC(4,2);
BEGIN
  base_weight := CASE p_trust_tier
    WHEN 'verified_local_contributor' THEN 1.35
    WHEN 'trusted_contributor' THEN 1.10
    WHEN 'repeat_local_contributor' THEN 0.82
    ELSE 0.55
  END;

  IF p_reputation_score >= 18 THEN
    RETURN LEAST(1.45, base_weight + 0.10);
  END IF;

  IF p_reputation_score >= 9 THEN
    RETURN LEAST(1.35, base_weight + 0.05);
  END IF;

  RETURN base_weight;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_pin_contributor_profiles()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH signal_window AS (
    SELECT
      pus.id,
      pus.user_id,
      pus.pin,
      pus.city,
      pus.state,
      pus.created_at,
      pus.delivery_days,
      pus.pressure_level
    FROM public.pin_user_signals pus
    WHERE pus.active = true
      AND pus.created_at >= NOW() - INTERVAL '90 days'
  ),
  corroborated AS (
    SELECT
      s1.id,
      EXISTS (
        SELECT 1
        FROM public.pin_user_signals s2
        WHERE s2.active = true
          AND s2.user_id <> s1.user_id
          AND s2.pin = s1.pin
          AND s2.created_at BETWEEN s1.created_at - INTERVAL '7 days' AND s1.created_at + INTERVAL '7 days'
          AND (
            (s1.pressure_level IS NOT NULL AND s1.pressure_level = s2.pressure_level)
            OR (
              s1.delivery_days IS NOT NULL
              AND s2.delivery_days IS NOT NULL
              AND ABS(s1.delivery_days - s2.delivery_days) <= 2
            )
          )
      ) AS is_corroborated
    FROM public.pin_user_signals s1
    WHERE s1.active = true
      AND s1.created_at >= NOW() - INTERVAL '90 days'
  ),
  pin_activity_counts AS (
    SELECT
      sw.user_id,
      sw.pin,
      MAX(sw.city) FILTER (WHERE sw.city IS NOT NULL AND sw.city <> '') AS city,
      MAX(sw.state) FILTER (WHERE sw.state IS NOT NULL AND sw.state <> '') AS state,
      COUNT(*) AS signal_count,
      MAX(sw.created_at) AS last_signal_at
    FROM signal_window sw
    GROUP BY sw.user_id, sw.pin
  ),
  ranked_signal_home AS (
    SELECT
      pac.user_id,
      pac.pin,
      pac.city,
      pac.state,
      ROW_NUMBER() OVER (
        PARTITION BY pac.user_id
        ORDER BY pac.signal_count DESC, pac.last_signal_at DESC
      ) AS pin_rank
    FROM pin_activity_counts pac
  ),
  aggregates AS (
    SELECT
      sw.user_id,
      COUNT(*) AS signal_count_90d,
      COUNT(*) FILTER (WHERE c.is_corroborated) AS corroborated_count_90d,
      COUNT(DISTINCT sw.pin) AS distinct_pin_count_90d,
      MAX(sw.created_at) AS last_signal_at
    FROM signal_window sw
    LEFT JOIN corroborated c
      ON c.id = sw.id
    GROUP BY sw.user_id
  ),
  trust_build AS (
    SELECT
      a.user_id,
      h.pin AS home_pin,
      h.city AS home_city,
      h.state AS home_state,
      a.signal_count_90d,
      a.corroborated_count_90d,
      a.distinct_pin_count_90d,
      a.last_signal_at,
      GREATEST(
        0,
        (a.corroborated_count_90d * 3)
        + LEAST(a.signal_count_90d, 12)
        - GREATEST(a.distinct_pin_count_90d - 4, 0) * 2
      )::INT AS reputation_score,
      CASE
        WHEN a.signal_count_90d >= 10
          AND a.corroborated_count_90d >= 6
          AND a.distinct_pin_count_90d <= 5 THEN 'trusted_contributor'
        WHEN a.signal_count_90d >= 4
          AND a.corroborated_count_90d >= 2
          AND a.distinct_pin_count_90d <= 4 THEN 'repeat_local_contributor'
        ELSE 'signed_in_user'
      END AS computed_tier
    FROM aggregates a
    LEFT JOIN ranked_signal_home h
      ON h.user_id = a.user_id
     AND h.pin_rank = 1
  )
  INSERT INTO public.pin_contributor_profiles (
    user_id,
    home_pin,
    home_city,
    home_state,
    trust_tier,
    source_weight,
    reputation_score,
    signal_count_90d,
    corroborated_count_90d,
    distinct_pin_count_90d,
    last_signal_at,
    updated_at
  )
  SELECT
    tb.user_id,
    tb.home_pin,
    tb.home_city,
    tb.home_state,
    CASE
      WHEN existing.manual_verification_tier = 'verified_local_contributor' THEN 'verified_local_contributor'
      WHEN existing.manual_verification_tier = 'trusted_contributor' THEN 'trusted_contributor'
      ELSE tb.computed_tier
    END AS trust_tier,
    public.compute_track_source_weight(
      CASE
        WHEN existing.manual_verification_tier = 'verified_local_contributor' THEN 'verified_local_contributor'
        WHEN existing.manual_verification_tier = 'trusted_contributor' THEN 'trusted_contributor'
        ELSE tb.computed_tier
      END,
      tb.reputation_score
    ) AS source_weight,
    tb.reputation_score,
    tb.signal_count_90d,
    tb.corroborated_count_90d,
    tb.distinct_pin_count_90d,
    tb.last_signal_at,
    NOW()
  FROM trust_build tb
  LEFT JOIN public.pin_contributor_profiles existing
    ON existing.user_id = tb.user_id
  ON CONFLICT (user_id) DO UPDATE
  SET
    home_pin = EXCLUDED.home_pin,
    home_city = EXCLUDED.home_city,
    home_state = EXCLUDED.home_state,
    trust_tier = CASE
      WHEN public.pin_contributor_profiles.manual_verification_tier = 'verified_local_contributor' THEN 'verified_local_contributor'
      WHEN public.pin_contributor_profiles.manual_verification_tier = 'trusted_contributor' THEN 'trusted_contributor'
      ELSE EXCLUDED.trust_tier
    END,
    source_weight = public.compute_track_source_weight(
      CASE
        WHEN public.pin_contributor_profiles.manual_verification_tier = 'verified_local_contributor' THEN 'verified_local_contributor'
        WHEN public.pin_contributor_profiles.manual_verification_tier = 'trusted_contributor' THEN 'trusted_contributor'
        ELSE EXCLUDED.trust_tier
      END,
      EXCLUDED.reputation_score
    ),
    reputation_score = EXCLUDED.reputation_score,
    signal_count_90d = EXCLUDED.signal_count_90d,
    corroborated_count_90d = EXCLUDED.corroborated_count_90d,
    distinct_pin_count_90d = EXCLUDED.distinct_pin_count_90d,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_pin_neighbor_edges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.pin_neighbor_edges;

  WITH pin_universe AS (
    SELECT pin, city, state, LEFT(pin, 3) AS pin_prefix3, LEFT(pin, 4) AS pin_prefix4
    FROM public.pin_data
    UNION
    SELECT DISTINCT
      r.pin,
      COALESCE(NULLIF(r.city, ''), pd.city) AS city,
      COALESCE(pd.state, '') AS state,
      LEFT(r.pin, 3) AS pin_prefix3,
      LEFT(r.pin, 4) AS pin_prefix4
    FROM public.reports r
    LEFT JOIN public.pin_data pd
      ON pd.pin = r.pin
    WHERE r.pin ~ '^[0-9]{6}$'
    UNION
    SELECT DISTINCT
      pus.pin,
      COALESCE(NULLIF(pus.city, ''), pd.city) AS city,
      COALESCE(NULLIF(pus.state, ''), pd.state, '') AS state,
      LEFT(pus.pin, 3) AS pin_prefix3,
      LEFT(pus.pin, 4) AS pin_prefix4
    FROM public.pin_user_signals pus
    LEFT JOIN public.pin_data pd
      ON pd.pin = pus.pin
    WHERE pus.pin ~ '^[0-9]{6}$'
  )
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
      WHEN a.city <> '' AND b.city <> '' AND a.city = b.city AND a.pin_prefix4 = b.pin_prefix4 THEN 'same_area_cluster'
      WHEN a.city <> '' AND b.city <> '' AND a.city = b.city AND a.pin_prefix3 = b.pin_prefix3 THEN 'same_subcluster'
      WHEN a.city <> '' AND b.city <> '' AND a.city = b.city THEN 'same_city'
      ELSE 'same_prefix3'
    END AS relation_type,
    CASE
      WHEN a.city <> '' AND b.city <> '' AND a.city = b.city AND a.pin_prefix4 = b.pin_prefix4 THEN 0.86
      WHEN a.city <> '' AND b.city <> '' AND a.city = b.city AND a.pin_prefix3 = b.pin_prefix3 THEN 0.68
      WHEN a.city <> '' AND b.city <> '' AND a.city = b.city THEN 0.42
      ELSE 0.22
    END AS edge_weight,
    COALESCE(a.city, b.city),
    COALESCE(NULLIF(a.state, ''), NULLIF(b.state, '')),
    true,
    NOW(),
    NOW()
  FROM pin_universe a
  JOIN pin_universe b
    ON a.pin <> b.pin
   AND (
     (a.city <> '' AND b.city <> '' AND a.city = b.city)
     OR a.pin_prefix3 = b.pin_prefix3
   );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pin_user_signal_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  contributor_profile public.pin_contributor_profiles%ROWTYPE;
  distinct_pins_7d INT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.pin_user_signals existing
    WHERE existing.user_id = NEW.user_id
      AND existing.pin = NEW.pin
      AND existing.created_at >= NOW() - INTERVAL '12 hours'
  ) THEN
    RAISE EXCEPTION 'track_signal_cooldown'
      USING HINT = 'You can add another local signal for this PIN after the cooldown window.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pin_user_signals existing
    WHERE existing.user_id = NEW.user_id
      AND existing.pin = NEW.pin
      AND existing.created_at >= NOW() - INTERVAL '72 hours'
      AND COALESCE(existing.delivery_days, -1) = COALESCE(NEW.delivery_days, -1)
      AND COALESCE(existing.pressure_level, '') = COALESCE(NEW.pressure_level, '')
      AND COALESCE(existing.note, '') = COALESCE(NEW.note, '')
  ) THEN
    RAISE EXCEPTION 'track_signal_duplicate'
      USING HINT = 'This local signal matches one you added recently for the same PIN.';
  END IF;

  SELECT COUNT(DISTINCT existing.pin)
  INTO distinct_pins_7d
  FROM public.pin_user_signals existing
  WHERE existing.user_id = NEW.user_id
    AND existing.created_at >= NOW() - INTERVAL '7 days';

  IF distinct_pins_7d >= 5 AND NOT EXISTS (
    SELECT 1
    FROM public.pin_user_signals existing
    WHERE existing.user_id = NEW.user_id
      AND existing.pin = NEW.pin
      AND existing.created_at >= NOW() - INTERVAL '7 days'
  ) THEN
    RAISE EXCEPTION 'track_signal_scope_limit'
      USING HINT = 'Keep local signals focused to a few nearby PINs in the same week.';
  END IF;

  SELECT *
  INTO contributor_profile
  FROM public.pin_contributor_profiles
  WHERE user_id = NEW.user_id;

  NEW.trust_tier := COALESCE(contributor_profile.trust_tier, 'signed_in_user');
  NEW.source_weight := COALESCE(contributor_profile.source_weight, 0.55);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.pin_track_summary_v1 AS
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
)
SELECT
  pu.pin,
  COALESCE(pdc.city, pu.city) AS city,
  COALESCE(pdc.state, pu.state) AS state,
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
LEFT JOIN public.pin_delivery_confidence pdc
  ON pdc.pin = pu.pin
LEFT JOIN public.pin_supply_pressure psp
  ON psp.pin = pu.pin
LEFT JOIN public.pin_distributor_coverage coverage
  ON coverage.pin = pu.pin
  AND coverage.is_primary = true
  AND coverage.active = true
LEFT JOIN public.distributors d
  ON d.id = coverage.distributor_id
  AND d.active = true;
