-- ============================================
-- CylinderCheck - Backfill / refresh Track confidence snapshots
-- Depends on:
--   2026-03-20_track-confidence-and-distributor-model.sql
--   2026-03-20_verified-track-signals.sql
--   2026-03-20_track-signal-propagation-columns.sql
--   2026-03-20_track-trust-ladder-and-neighbor-graph.sql
--
-- Rebuild strategy:
--   1. Refresh contributor trust profiles and nearby-pin edges first.
--   2. Prefer exact-PIN reports and exact trusted signals.
--   3. Use neighbor edges instead of blunt prefix-only spillover.
--   4. Expand beyond seeded pin_data whenever reports/signals exist.
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_track_confidence_snapshots()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_pin_contributor_profiles();
  PERFORM public.refresh_pin_neighbor_edges();

  WITH base_pins AS (
    SELECT
      pin_rows.pin,
      LEFT(pin_rows.pin, 3) AS pin_prefix3,
      MAX(pin_rows.city) FILTER (WHERE pin_rows.city IS NOT NULL AND pin_rows.city <> '') AS city,
      MAX(pin_rows.state) FILTER (WHERE pin_rows.state IS NOT NULL AND pin_rows.state <> '') AS state,
      MAX(pin_rows.avg_days) AS avg_days
    FROM (
      SELECT pd.pin, pd.city, pd.state, pd.avg_days
      FROM public.pin_data pd
      UNION ALL
      SELECT DISTINCT
        r.pin,
        NULLIF(r.city, '') AS city,
        pd.state,
        NULL::NUMERIC AS avg_days
      FROM public.reports r
      LEFT JOIN public.pin_data pd
        ON pd.pin = r.pin
      WHERE r.pin ~ '^[0-9]{6}$'
        AND r.is_hidden IS NOT TRUE
      UNION ALL
      SELECT DISTINCT
        pus.pin,
        NULLIF(pus.city, '') AS city,
        COALESCE(NULLIF(pus.state, ''), pd.state) AS state,
        NULL::NUMERIC AS avg_days
      FROM public.pin_user_signals pus
      LEFT JOIN public.pin_data pd
        ON pd.pin = pus.pin
      WHERE pus.pin ~ '^[0-9]{6}$'
        AND pus.active = true
    ) AS pin_rows
    GROUP BY pin_rows.pin
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
  ON CONFLICT (pin) DO UPDATE
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
      pin_rows.pin,
      LEFT(pin_rows.pin, 3) AS pin_prefix3,
      MAX(pin_rows.city) FILTER (WHERE pin_rows.city IS NOT NULL AND pin_rows.city <> '') AS city,
      MAX(pin_rows.state) FILTER (WHERE pin_rows.state IS NOT NULL AND pin_rows.state <> '') AS state,
      MAX(pin_rows.avg_days) AS avg_days
    FROM (
      SELECT pd.pin, pd.city, pd.state, pd.avg_days
      FROM public.pin_data pd
      UNION ALL
      SELECT DISTINCT
        r.pin,
        NULLIF(r.city, '') AS city,
        pd.state,
        NULL::NUMERIC AS avg_days
      FROM public.reports r
      LEFT JOIN public.pin_data pd
        ON pd.pin = r.pin
      WHERE r.pin ~ '^[0-9]{6}$'
        AND r.is_hidden IS NOT TRUE
      UNION ALL
      SELECT DISTINCT
        pus.pin,
        NULLIF(pus.city, '') AS city,
        COALESCE(NULLIF(pus.state, ''), pd.state) AS state,
        NULL::NUMERIC AS avg_days
      FROM public.pin_user_signals pus
      LEFT JOIN public.pin_data pd
        ON pd.pin = pus.pin
      WHERE pus.pin ~ '^[0-9]{6}$'
        AND pus.active = true
    ) AS pin_rows
    GROUP BY pin_rows.pin
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
  ON CONFLICT (pin) DO UPDATE
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
$$;

COMMENT ON FUNCTION public.refresh_track_confidence_snapshots IS
  'Rebuilds pin_delivery_confidence and pin_supply_pressure from reports, trust-scored user signals, and weighted nearby-pin edges.';
