-- ============================================
-- CylinderCheck - Track split contract fix
-- Date: 2026-03-25
-- Purpose:
--   1. Repair the unified Track view against the real canonical schema.
--   2. Preserve domestic/commercial split rows safely.
--   3. Update snapshot refreshes to write domestic rows by (pin, product_type).
-- ============================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.pin_data') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_data. Apply the base schema first.';
  END IF;

  IF to_regclass('public.reports') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.reports. Apply the base schema first.';
  END IF;

  IF to_regclass('public.pin_user_signals') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_user_signals. Apply the base schema first.';
  END IF;

  IF to_regclass('public.pin_profiles') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_profiles. Apply the pin profile migrations first.';
  END IF;

  IF to_regclass('public.pin_delivery_confidence') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_delivery_confidence. Apply the track model migrations first.';
  END IF;

  IF to_regclass('public.pin_supply_pressure') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_supply_pressure. Apply the track model migrations first.';
  END IF;

  IF to_regclass('public.distributors') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.distributors. Apply the track model migrations first.';
  END IF;

  IF to_regclass('public.pin_distributor_coverage') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.pin_distributor_coverage. Apply the track model migrations first.';
  END IF;
END $$;

ALTER TABLE public.pin_supply_pressure
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg';

ALTER TABLE public.pin_delivery_confidence
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'domestic_14_2kg';

ALTER TABLE public.pin_supply_pressure
  DROP CONSTRAINT IF EXISTS pin_supply_pressure_pkey;

DO $$
BEGIN
  ALTER TABLE public.pin_supply_pressure
    ADD PRIMARY KEY (pin, product_type);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.pin_delivery_confidence
  DROP CONSTRAINT IF EXISTS pin_delivery_confidence_pkey;

DO $$
BEGIN
  ALTER TABLE public.pin_delivery_confidence
    ADD PRIMARY KEY (pin, product_type);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_distributor_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_delivery_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_supply_pressure ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'distributors'
      AND policyname = 'Anyone can read distributors'
  ) THEN
    CREATE POLICY "Anyone can read distributors"
      ON public.distributors
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_distributor_coverage'
      AND policyname = 'Anyone can read pin distributor coverage'
  ) THEN
    CREATE POLICY "Anyone can read pin distributor coverage"
      ON public.pin_distributor_coverage
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_delivery_confidence'
      AND policyname = 'Anyone can read pin delivery confidence'
  ) THEN
    CREATE POLICY "Anyone can read pin delivery confidence"
      ON public.pin_delivery_confidence
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_supply_pressure'
      AND policyname = 'Anyone can read pin supply pressure'
  ) THEN
    CREATE POLICY "Anyone can read pin supply pressure"
      ON public.pin_supply_pressure
      FOR SELECT
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_track_confidence_snapshots()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.refresh_pin_profiles();
  PERFORM public.refresh_pin_contributor_profiles();
  PERFORM public.refresh_pin_neighbor_edges();

  WITH base_pins AS (
    SELECT
      pp.pin,
      pp.pin_prefix3,
      pp.canonical_city AS city,
      pp.canonical_state AS state,
      pd.avg_days
    FROM public.pin_profiles pp
    LEFT JOIN public.pin_data pd
      ON pd.pin = pp.pin
  ),
  active_signals AS (
    SELECT
      pus.pin,
      pus.city,
      pus.state,
      pus.delivery_days,
      pus.pressure_level,
      pus.created_at,
      pus.trust_tier,
      pus.source_weight,
      CASE
        WHEN pus.created_at >= NOW() - INTERVAL '7 days' THEN 1.00
        WHEN pus.created_at >= NOW() - INTERVAL '14 days' THEN 0.85
        WHEN pus.created_at >= NOW() - INTERVAL '21 days' THEN 0.72
        ELSE 0.58
      END::NUMERIC(4,2) AS age_weight,
      ROUND(
        pus.source_weight * CASE
          WHEN pus.created_at >= NOW() - INTERVAL '7 days' THEN 1.00
          WHEN pus.created_at >= NOW() - INTERVAL '14 days' THEN 0.85
          WHEN pus.created_at >= NOW() - INTERVAL '21 days' THEN 0.72
          ELSE 0.58
        END,
        2
      )::NUMERIC(4,2) AS effective_weight
    FROM public.pin_user_signals pus
    WHERE pus.active = true
      AND pus.expires_at > NOW()
      AND pus.created_at >= NOW() - INTERVAL '30 days'
  ),
  exact_signal_counts AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (
        WHERE s.delivery_days IS NOT NULL
          AND s.effective_weight >= 0.55
      ) AS delivery_signal_count_30d,
      COUNT(*) FILTER (
        WHERE s.pressure_level IS NOT NULL
          AND s.effective_weight >= 0.55
      ) AS pressure_signal_count_30d
    FROM base_pins b
    LEFT JOIN active_signals s
      ON s.pin = b.pin
    GROUP BY b.pin
  ),
  local_delivery_values AS (
    SELECT
      b.pin AS base_pin,
      COALESCE(NULLIF(r.city, ''), b.city) AS city,
      b.state AS state,
      r.delivery_days::NUMERIC(6,2) AS delivery_days,
      r.created_at AS observed_at
    FROM base_pins b
    JOIN public.reports r
      ON r.pin = b.pin
     AND r.is_hidden IS NOT TRUE
     AND r.delivery_days IS NOT NULL
     AND r.created_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT
      b.pin AS base_pin,
      COALESCE(NULLIF(s.city, ''), b.city) AS city,
      COALESCE(NULLIF(s.state, ''), b.state) AS state,
      s.delivery_days::NUMERIC(6,2) AS delivery_days,
      s.created_at AS observed_at
    FROM base_pins b
    JOIN active_signals s
      ON s.pin = b.pin
     AND s.delivery_days IS NOT NULL
     AND s.effective_weight >= 0.55
  ),
  local_delivery_stats AS (
    SELECT
      base_pin AS pin,
      MAX(city) FILTER (WHERE city IS NOT NULL) AS city,
      MAX(state) FILTER (WHERE state IS NOT NULL) AS state,
      COUNT(*) FILTER (WHERE observed_at >= NOW() - INTERVAL '7 days') AS sample_size_7d,
      COUNT(*) AS sample_size_30d,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_p25,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_median,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_p75,
      MAX(observed_at) AS last_observed_at
    FROM local_delivery_values
    GROUP BY base_pin
  ),
  nearby_delivery_values AS (
    SELECT
      b.pin AS base_pin,
      s.delivery_days::NUMERIC(6,2) AS delivery_days,
      s.created_at AS observed_at
    FROM base_pins b
    JOIN public.pin_neighbor_edges pne
      ON pne.pin = b.pin
     AND pne.active = true
    JOIN active_signals s
      ON s.pin = pne.nearby_pin
     AND s.delivery_days IS NOT NULL
     AND (s.effective_weight * pne.edge_weight) >= 0.42
  ),
  nearby_delivery_stats AS (
    SELECT
      base_pin AS pin,
      COUNT(*) AS sample_size_30d,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_p25,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_median,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_p75,
      MAX(observed_at) AS last_observed_at
    FROM nearby_delivery_values
    GROUP BY base_pin
  ),
  report_pressure_stats AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
      ) AS report_count_7d,
      COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '30 days'
      ) AS report_count_30d,
      COUNT(*) FILTER (
        WHERE r.created_at < NOW() - INTERVAL '7 days'
          AND r.created_at >= NOW() - INTERVAL '14 days'
      ) AS prior_7d_count,
      MAX(r.created_at) AS last_report_at
    FROM base_pins b
    LEFT JOIN public.reports r
      ON r.pin = b.pin
     AND r.is_hidden IS NOT TRUE
     AND r.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY b.pin
  ),
  exact_pressure_signal_stats AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (WHERE s.pressure_level IS NOT NULL) AS signal_count_30d,
      COUNT(DISTINCT s.pressure_level) FILTER (WHERE s.pressure_level IS NOT NULL) AS distinct_level_count,
      ROUND(COALESCE(SUM(
        CASE s.pressure_level
          WHEN 'severe' THEN 20
          WHEN 'active' THEN 14
          WHEN 'building' THEN 8
          WHEN 'low' THEN 2
          ELSE 0
        END * s.effective_weight
      ), 0))::INT AS pressure_score
    FROM base_pins b
    LEFT JOIN active_signals s
      ON s.pin = b.pin
    GROUP BY b.pin
  ),
  nearby_pressure_signal_stats AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (WHERE s.pressure_level IS NOT NULL) AS signal_count_30d,
      COUNT(DISTINCT s.pressure_level) FILTER (WHERE s.pressure_level IS NOT NULL) AS distinct_level_count,
      ROUND(COALESCE(SUM(
        CASE s.pressure_level
          WHEN 'severe' THEN 20
          WHEN 'active' THEN 14
          WHEN 'building' THEN 8
          WHEN 'low' THEN 2
          ELSE 0
        END * s.effective_weight * pne.edge_weight
      ), 0))::INT AS pressure_score
    FROM base_pins b
    LEFT JOIN public.pin_neighbor_edges pne
      ON pne.pin = b.pin
     AND pne.active = true
    LEFT JOIN active_signals s
      ON s.pin = pne.nearby_pin
     AND s.pressure_level IS NOT NULL
     AND (s.effective_weight * pne.edge_weight) >= 0.32
    GROUP BY b.pin
  )
  INSERT INTO public.pin_delivery_confidence (
    pin,
    product_type,
    city,
    state,
    sample_size_7d,
    sample_size_30d,
    delivery_days_p25,
    delivery_days_median,
    delivery_days_p75,
    historical_avg_days,
    exact_signal_count_30d,
    nearby_signal_count_30d,
    source_scope,
    confidence_level,
    freshness_status,
    last_observed_at,
    updated_at
  )
  SELECT
    b.pin,
    'domestic_14_2kg' AS product_type,
    COALESCE(lds.city, b.city) AS city,
    COALESCE(lds.state, b.state) AS state,
    COALESCE(lds.sample_size_7d, 0) AS sample_size_7d,
    COALESCE(lds.sample_size_30d, 0) AS sample_size_30d,
    CASE
      WHEN COALESCE(lds.sample_size_30d, 0) > 0 THEN lds.delivery_days_p25
      WHEN COALESCE(nds.sample_size_30d, 0) >= 3 THEN nds.delivery_days_p25
      ELSE NULL
    END AS delivery_days_p25,
    CASE
      WHEN COALESCE(lds.sample_size_30d, 0) > 0 THEN lds.delivery_days_median
      WHEN COALESCE(nds.sample_size_30d, 0) >= 3 THEN nds.delivery_days_median
      ELSE NULL
    END AS delivery_days_median,
    CASE
      WHEN COALESCE(lds.sample_size_30d, 0) > 0 THEN lds.delivery_days_p75
      WHEN COALESCE(nds.sample_size_30d, 0) >= 3 THEN nds.delivery_days_p75
      ELSE NULL
    END AS delivery_days_p75,
    b.avg_days AS historical_avg_days,
    COALESCE(esc.delivery_signal_count_30d, 0) AS exact_signal_count_30d,
    COALESCE(nds.sample_size_30d, 0) AS nearby_signal_count_30d,
    CASE
      WHEN COALESCE(lds.sample_size_30d, 0) > 0 THEN 'local'
      WHEN COALESCE(nds.sample_size_30d, 0) >= 3 THEN 'nearby'
      WHEN b.avg_days IS NOT NULL THEN 'historical'
      ELSE 'none'
    END AS source_scope,
    CASE
      WHEN COALESCE(lds.sample_size_30d, 0) >= 8 THEN 'high'
      WHEN COALESCE(lds.sample_size_30d, 0) >= 3 THEN 'medium'
      WHEN COALESCE(lds.sample_size_30d, 0) >= 1 THEN 'low'
      WHEN COALESCE(nds.sample_size_30d, 0) >= 4 THEN 'low'
      ELSE 'limited'
    END AS confidence_level,
    CASE
      WHEN COALESCE(lds.last_observed_at, nds.last_observed_at) >= NOW() - INTERVAL '7 days' THEN 'fresh'
      WHEN COALESCE(lds.last_observed_at, nds.last_observed_at) >= NOW() - INTERVAL '30 days' THEN 'aging'
      ELSE 'stale'
    END AS freshness_status,
    COALESCE(lds.last_observed_at, nds.last_observed_at) AS last_observed_at,
    NOW() AS updated_at
  FROM base_pins b
  LEFT JOIN local_delivery_stats lds
    ON lds.pin = b.pin
  LEFT JOIN nearby_delivery_stats nds
    ON nds.pin = b.pin
  LEFT JOIN exact_signal_counts esc
    ON esc.pin = b.pin
  ON CONFLICT (pin, product_type) DO UPDATE
  SET
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    sample_size_7d = EXCLUDED.sample_size_7d,
    sample_size_30d = EXCLUDED.sample_size_30d,
    delivery_days_p25 = EXCLUDED.delivery_days_p25,
    delivery_days_median = EXCLUDED.delivery_days_median,
    delivery_days_p75 = EXCLUDED.delivery_days_p75,
    historical_avg_days = EXCLUDED.historical_avg_days,
    exact_signal_count_30d = EXCLUDED.exact_signal_count_30d,
    nearby_signal_count_30d = EXCLUDED.nearby_signal_count_30d,
    source_scope = EXCLUDED.source_scope,
    confidence_level = EXCLUDED.confidence_level,
    freshness_status = EXCLUDED.freshness_status,
    last_observed_at = EXCLUDED.last_observed_at,
    updated_at = EXCLUDED.updated_at;

  WITH base_pins AS (
    SELECT
      pp.pin,
      pp.pin_prefix3,
      pp.canonical_city AS city,
      pp.canonical_state AS state,
      pd.avg_days
    FROM public.pin_profiles pp
    LEFT JOIN public.pin_data pd
      ON pd.pin = pp.pin
  ),
  active_signals AS (
    SELECT
      pus.pin,
      pus.delivery_days,
      pus.pressure_level,
      pus.created_at,
      ROUND(
        pus.source_weight * CASE
          WHEN pus.created_at >= NOW() - INTERVAL '7 days' THEN 1.00
          WHEN pus.created_at >= NOW() - INTERVAL '14 days' THEN 0.85
          WHEN pus.created_at >= NOW() - INTERVAL '21 days' THEN 0.72
          ELSE 0.58
        END,
        2
      )::NUMERIC(4,2) AS effective_weight
    FROM public.pin_user_signals pus
    WHERE pus.active = true
      AND pus.expires_at > NOW()
      AND pus.created_at >= NOW() - INTERVAL '30 days'
  ),
  local_delivery_values AS (
    SELECT
      b.pin AS base_pin,
      r.delivery_days::NUMERIC(6,2) AS delivery_days,
      r.created_at AS observed_at
    FROM base_pins b
    JOIN public.reports r
      ON r.pin = b.pin
     AND r.is_hidden IS NOT TRUE
     AND r.delivery_days IS NOT NULL
     AND r.created_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT
      b.pin AS base_pin,
      s.delivery_days::NUMERIC(6,2) AS delivery_days,
      s.created_at AS observed_at
    FROM base_pins b
    JOIN active_signals s
      ON s.pin = b.pin
     AND s.delivery_days IS NOT NULL
     AND s.effective_weight >= 0.55
  ),
  local_delivery_stats AS (
    SELECT
      base_pin AS pin,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_median,
      MAX(observed_at) AS last_observed_at
    FROM local_delivery_values
    GROUP BY base_pin
  ),
  nearby_delivery_values AS (
    SELECT
      b.pin AS base_pin,
      s.delivery_days::NUMERIC(6,2) AS delivery_days,
      s.created_at AS observed_at
    FROM base_pins b
    JOIN public.pin_neighbor_edges pne
      ON pne.pin = b.pin
     AND pne.active = true
    JOIN active_signals s
      ON s.pin = pne.nearby_pin
     AND s.delivery_days IS NOT NULL
     AND (s.effective_weight * pne.edge_weight) >= 0.42
  ),
  nearby_delivery_stats AS (
    SELECT
      base_pin AS pin,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY delivery_days)::NUMERIC(4,1) AS delivery_days_median,
      MAX(observed_at) AS last_observed_at
    FROM nearby_delivery_values
    GROUP BY base_pin
  ),
  report_pressure_stats AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
      ) AS report_count_7d,
      COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '30 days'
      ) AS report_count_30d,
      COUNT(*) FILTER (
        WHERE r.created_at < NOW() - INTERVAL '7 days'
          AND r.created_at >= NOW() - INTERVAL '14 days'
      ) AS prior_7d_count,
      MAX(r.created_at) AS last_report_at
    FROM base_pins b
    LEFT JOIN public.reports r
      ON r.pin = b.pin
     AND r.is_hidden IS NOT TRUE
     AND r.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY b.pin
  ),
  exact_pressure_signal_stats AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (WHERE s.pressure_level IS NOT NULL) AS signal_count_30d,
      COUNT(DISTINCT s.pressure_level) FILTER (WHERE s.pressure_level IS NOT NULL) AS distinct_level_count,
      ROUND(COALESCE(SUM(
        CASE s.pressure_level
          WHEN 'severe' THEN 20
          WHEN 'active' THEN 14
          WHEN 'building' THEN 8
          WHEN 'low' THEN 2
          ELSE 0
        END * s.effective_weight
      ), 0))::INT AS pressure_score
    FROM base_pins b
    LEFT JOIN active_signals s
      ON s.pin = b.pin
    GROUP BY b.pin
  ),
  nearby_pressure_signal_stats AS (
    SELECT
      b.pin,
      COUNT(*) FILTER (WHERE s.pressure_level IS NOT NULL) AS signal_count_30d,
      COUNT(DISTINCT s.pressure_level) FILTER (WHERE s.pressure_level IS NOT NULL) AS distinct_level_count,
      ROUND(COALESCE(SUM(
        CASE s.pressure_level
          WHEN 'severe' THEN 20
          WHEN 'active' THEN 14
          WHEN 'building' THEN 8
          WHEN 'low' THEN 2
          ELSE 0
        END * s.effective_weight * pne.edge_weight
      ), 0))::INT AS pressure_score
    FROM base_pins b
    LEFT JOIN public.pin_neighbor_edges pne
      ON pne.pin = b.pin
     AND pne.active = true
    LEFT JOIN active_signals s
      ON s.pin = pne.nearby_pin
     AND s.pressure_level IS NOT NULL
     AND (s.effective_weight * pne.edge_weight) >= 0.32
    GROUP BY b.pin
  )
  INSERT INTO public.pin_supply_pressure (
    pin,
    product_type,
    city,
    state,
    report_count_7d,
    report_count_30d,
    trend_direction,
    pressure_score,
    pressure_level,
    exact_signal_count_30d,
    nearby_signal_count_30d,
    source_scope,
    last_report_at,
    updated_at
  )
  SELECT
    b.pin,
    'domestic_14_2kg' AS product_type,
    b.city,
    b.state,
    COALESCE(rps.report_count_7d, 0) AS report_count_7d,
    COALESCE(rps.report_count_30d, 0) AS report_count_30d,
    CASE
      WHEN COALESCE(rps.report_count_7d, 0) > COALESCE(rps.prior_7d_count, 0) + 1 THEN 'rising'
      WHEN COALESCE(rps.report_count_7d, 0) < COALESCE(rps.prior_7d_count, 0) THEN 'easing'
      ELSE 'steady'
    END AS trend_direction,
    GREATEST(
      0,
      LEAST(
        100,
        (COALESCE(rps.report_count_7d, 0) * 16)
        +
        (GREATEST(COALESCE(rps.report_count_30d, 0) - COALESCE(rps.report_count_7d, 0), 0) * 6)
        +
        LEAST(COALESCE(eps.pressure_score, 0), 22)
        +
        LEAST(COALESCE(nps.pressure_score, 0), 10)
        +
        CASE
          WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 10 THEN 12
          WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 7 THEN 9
          ELSE 0
        END
        +
        CASE
          WHEN COALESCE(rps.report_count_7d, 0) > COALESCE(rps.prior_7d_count, 0) + 1 THEN 10
          ELSE 0
        END
        -
        CASE
          WHEN COALESCE(eps.distinct_level_count, 0) >= 3 THEN 8
          WHEN COALESCE(nps.distinct_level_count, 0) >= 3 THEN 4
          ELSE 0
        END
      )
    )::INT AS pressure_score,
    CASE
      WHEN COALESCE(rps.report_count_30d, 0) = 0
        AND COALESCE(eps.signal_count_30d, 0) = 0
        AND COALESCE(nps.signal_count_30d, 0) = 0
        AND COALESCE(lds.last_observed_at, nds.last_observed_at) IS NULL THEN 'limited'
      WHEN GREATEST(
        0,
        LEAST(
          100,
          (COALESCE(rps.report_count_7d, 0) * 16)
          +
          (GREATEST(COALESCE(rps.report_count_30d, 0) - COALESCE(rps.report_count_7d, 0), 0) * 6)
          +
          LEAST(COALESCE(eps.pressure_score, 0), 22)
          +
          LEAST(COALESCE(nps.pressure_score, 0), 10)
          +
          CASE
            WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 10 THEN 12
            WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 7 THEN 9
            ELSE 0
          END
          +
          CASE
            WHEN COALESCE(rps.report_count_7d, 0) > COALESCE(rps.prior_7d_count, 0) + 1 THEN 10
            ELSE 0
          END
          -
          CASE
            WHEN COALESCE(eps.distinct_level_count, 0) >= 3 THEN 8
            WHEN COALESCE(nps.distinct_level_count, 0) >= 3 THEN 4
            ELSE 0
          END
        )
      ) >= 70 THEN 'severe'
      WHEN GREATEST(
        0,
        LEAST(
          100,
          (COALESCE(rps.report_count_7d, 0) * 16)
          +
          (GREATEST(COALESCE(rps.report_count_30d, 0) - COALESCE(rps.report_count_7d, 0), 0) * 6)
          +
          LEAST(COALESCE(eps.pressure_score, 0), 22)
          +
          LEAST(COALESCE(nps.pressure_score, 0), 10)
          +
          CASE
            WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 10 THEN 12
            WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 7 THEN 9
            ELSE 0
          END
          +
          CASE
            WHEN COALESCE(rps.report_count_7d, 0) > COALESCE(rps.prior_7d_count, 0) + 1 THEN 10
            ELSE 0
          END
          -
          CASE
            WHEN COALESCE(eps.distinct_level_count, 0) >= 3 THEN 8
            WHEN COALESCE(nps.distinct_level_count, 0) >= 3 THEN 4
            ELSE 0
          END
        )
      ) >= 42 THEN 'active'
      WHEN GREATEST(
        0,
        LEAST(
          100,
          (COALESCE(rps.report_count_7d, 0) * 16)
          +
          (GREATEST(COALESCE(rps.report_count_30d, 0) - COALESCE(rps.report_count_7d, 0), 0) * 6)
          +
          LEAST(COALESCE(eps.pressure_score, 0), 22)
          +
          LEAST(COALESCE(nps.pressure_score, 0), 10)
          +
          CASE
            WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 10 THEN 12
            WHEN COALESCE(lds.delivery_days_median, nds.delivery_days_median, b.avg_days) >= 7 THEN 9
            ELSE 0
          END
          +
          CASE
            WHEN COALESCE(rps.report_count_7d, 0) > COALESCE(rps.prior_7d_count, 0) + 1 THEN 10
            ELSE 0
          END
          -
          CASE
            WHEN COALESCE(eps.distinct_level_count, 0) >= 3 THEN 8
            WHEN COALESCE(nps.distinct_level_count, 0) >= 3 THEN 4
            ELSE 0
          END
        )
      ) >= 20 THEN 'building'
      ELSE 'low'
    END AS pressure_level,
    COALESCE(eps.signal_count_30d, 0) AS exact_signal_count_30d,
    COALESCE(nps.signal_count_30d, 0) AS nearby_signal_count_30d,
    CASE
      WHEN COALESCE(rps.report_count_30d, 0) > 0 OR COALESCE(eps.signal_count_30d, 0) > 0 THEN
        CASE
          WHEN COALESCE(nps.signal_count_30d, 0) > 0 THEN 'mixed'
          ELSE 'local'
        END
      WHEN COALESCE(nps.signal_count_30d, 0) > 0 THEN 'nearby'
      ELSE 'none'
    END AS source_scope,
    rps.last_report_at,
    NOW() AS updated_at
  FROM base_pins b
  LEFT JOIN report_pressure_stats rps
    ON rps.pin = b.pin
  LEFT JOIN exact_pressure_signal_stats eps
    ON eps.pin = b.pin
  LEFT JOIN nearby_pressure_signal_stats nps
    ON nps.pin = b.pin
  LEFT JOIN local_delivery_stats lds
    ON lds.pin = b.pin
  LEFT JOIN nearby_delivery_stats nds
    ON nds.pin = b.pin
  ON CONFLICT (pin, product_type) DO UPDATE
  SET
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    report_count_7d = EXCLUDED.report_count_7d,
    report_count_30d = EXCLUDED.report_count_30d,
    trend_direction = EXCLUDED.trend_direction,
    pressure_score = EXCLUDED.pressure_score,
    pressure_level = EXCLUDED.pressure_level,
    exact_signal_count_30d = EXCLUDED.exact_signal_count_30d,
    nearby_signal_count_30d = EXCLUDED.nearby_signal_count_30d,
    source_scope = EXCLUDED.source_scope,
    last_report_at = EXCLUDED.last_report_at,
    updated_at = EXCLUDED.updated_at;
END;
$function$;

DROP VIEW IF EXISTS public.pin_track_summary_v1;

CREATE VIEW public.pin_track_summary_v1
WITH (security_invoker = true) AS
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
    NULL::TEXT AS area
  FROM public.pin_data pd
  WHERE pd.pin ~ '^[0-9]{6}$'
  UNION
  SELECT DISTINCT
    r.pin,
    COALESCE(NULLIF(r.city, ''), pp.canonical_city, pd.city) AS city,
    COALESCE(pp.canonical_state, pd.state, '') AS state,
    COALESCE(pp.canonical_area, '') AS area
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
    COALESCE(NULLIF(pus.area, ''), pp.canonical_area, '') AS area
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
  ON pdc.pin = pu.pin
 AND pdc.product_type = pt.product_type
LEFT JOIN public.pin_supply_pressure psp
  ON psp.pin = pu.pin
 AND psp.product_type = pt.product_type
LEFT JOIN public.pin_distributor_coverage coverage
  ON coverage.pin = pu.pin
 AND coverage.is_primary = true
 AND coverage.active = true
LEFT JOIN public.distributors d
  ON d.id = coverage.distributor_id
 AND d.active = true
WHERE pdc.pin IS NOT NULL OR psp.pin IS NOT NULL OR pt.product_type = 'domestic_14_2kg';

COMMENT ON FUNCTION public.refresh_track_confidence_snapshots IS
  'Rebuilds domestic 14.2kg track snapshots by (pin, product_type) while preserving separately seeded product splits.';

COMMIT;
