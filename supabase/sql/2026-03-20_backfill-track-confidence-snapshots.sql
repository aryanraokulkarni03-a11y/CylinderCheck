-- ============================================
-- CylinderCheck - Backfill / refresh Track confidence snapshots
-- Depends on:
--   2026-03-20_track-confidence-and-distributor-model.sql
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_track_confidence_snapshots()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delivery confidence snapshot
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
    confidence_level,
    freshness_status,
    last_observed_at,
    updated_at
  )
  SELECT
    pd.pin,
    COALESCE(MAX(r.city) FILTER (WHERE r.city IS NOT NULL), pd.city) AS city,
    pd.state,
    COUNT(*) FILTER (
      WHERE r.delivery_days IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '7 days'
    ) AS sample_size_7d,
    COUNT(*) FILTER (
      WHERE r.delivery_days IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '30 days'
    ) AS sample_size_30d,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY r.delivery_days)
      FILTER (
        WHERE r.delivery_days IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '30 days'
      ) AS delivery_days_p25,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY r.delivery_days)
      FILTER (
        WHERE r.delivery_days IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '30 days'
      ) AS delivery_days_median,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY r.delivery_days)
      FILTER (
        WHERE r.delivery_days IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '30 days'
      ) AS delivery_days_p75,
    pd.avg_days AS historical_avg_days,
    CASE
      WHEN COUNT(*) FILTER (
        WHERE r.delivery_days IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '30 days'
      ) >= 8 THEN 'high'
      WHEN COUNT(*) FILTER (
        WHERE r.delivery_days IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '30 days'
      ) >= 3 THEN 'medium'
      WHEN COUNT(*) FILTER (
        WHERE r.delivery_days IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '30 days'
      ) >= 1 THEN 'low'
      ELSE 'limited'
    END AS confidence_level,
    CASE
      WHEN MAX(r.created_at) FILTER (WHERE r.delivery_days IS NOT NULL) >= NOW() - INTERVAL '7 days' THEN 'fresh'
      WHEN MAX(r.created_at) FILTER (WHERE r.delivery_days IS NOT NULL) >= NOW() - INTERVAL '30 days' THEN 'aging'
      ELSE 'stale'
    END AS freshness_status,
    MAX(r.created_at) FILTER (WHERE r.delivery_days IS NOT NULL) AS last_observed_at,
    NOW() AS updated_at
  FROM public.pin_data pd
  LEFT JOIN public.reports r
    ON r.pin = pd.pin
    AND r.is_hidden IS NOT TRUE
  GROUP BY pd.pin, pd.city, pd.state, pd.avg_days
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
    confidence_level = EXCLUDED.confidence_level,
    freshness_status = EXCLUDED.freshness_status,
    last_observed_at = EXCLUDED.last_observed_at,
    updated_at = EXCLUDED.updated_at;

  -- Supply pressure snapshot
  INSERT INTO public.pin_supply_pressure (
    pin,
    city,
    state,
    report_count_7d,
    report_count_30d,
    trend_direction,
    pressure_score,
    pressure_level,
    last_report_at,
    updated_at
  )
  SELECT
    pd.pin,
    COALESCE(MAX(r.city) FILTER (WHERE r.city IS NOT NULL), pd.city) AS city,
    pd.state,
    COUNT(*) FILTER (
      WHERE r.created_at >= NOW() - INTERVAL '7 days'
    ) AS report_count_7d,
    COUNT(*) FILTER (
      WHERE r.created_at >= NOW() - INTERVAL '30 days'
    ) AS report_count_30d,
    CASE
      WHEN COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
      ) > COUNT(*) FILTER (
        WHERE r.created_at < NOW() - INTERVAL '7 days'
          AND r.created_at >= NOW() - INTERVAL '14 days'
      ) + 1 THEN 'rising'
      WHEN COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
      ) < COUNT(*) FILTER (
        WHERE r.created_at < NOW() - INTERVAL '7 days'
          AND r.created_at >= NOW() - INTERVAL '14 days'
      ) THEN 'easing'
      ELSE 'steady'
    END AS trend_direction,
    LEAST(
      100,
      (COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
      ) * 16)
      +
      (GREATEST(
        COUNT(*) FILTER (
          WHERE r.created_at >= NOW() - INTERVAL '30 days'
        )
        -
        COUNT(*) FILTER (
          WHERE r.created_at >= NOW() - INTERVAL '7 days'
        ),
        0
      ) * 6)
      +
      CASE
        WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 10 THEN 12
        WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 7 THEN 10
        ELSE 0
      END
      +
      CASE
        WHEN COUNT(*) FILTER (
          WHERE r.created_at >= NOW() - INTERVAL '7 days'
        ) > COUNT(*) FILTER (
          WHERE r.created_at < NOW() - INTERVAL '7 days'
            AND r.created_at >= NOW() - INTERVAL '14 days'
        ) + 1 THEN 12
        ELSE 0
      END
    )::INT AS pressure_score,
    CASE
      WHEN COUNT(*) FILTER (
        WHERE r.created_at >= NOW() - INTERVAL '30 days'
      ) = 0
        AND MAX(pdc.last_observed_at) IS NULL THEN 'limited'
      WHEN LEAST(
        100,
        (COUNT(*) FILTER (
          WHERE r.created_at >= NOW() - INTERVAL '7 days'
        ) * 16)
        +
        (GREATEST(
          COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '30 days'
          )
          -
          COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
          ),
          0
        ) * 6)
        +
        CASE
          WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 10 THEN 12
          WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 7 THEN 10
          ELSE 0
        END
        +
        CASE
          WHEN COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
          ) > COUNT(*) FILTER (
            WHERE r.created_at < NOW() - INTERVAL '7 days'
              AND r.created_at >= NOW() - INTERVAL '14 days'
          ) + 1 THEN 12
          ELSE 0
        END
      ) >= 70 THEN 'severe'
      WHEN LEAST(
        100,
        (COUNT(*) FILTER (
          WHERE r.created_at >= NOW() - INTERVAL '7 days'
        ) * 16)
        +
        (GREATEST(
          COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '30 days'
          )
          -
          COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
          ),
          0
        ) * 6)
        +
        CASE
          WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 10 THEN 12
          WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 7 THEN 10
          ELSE 0
        END
        +
        CASE
          WHEN COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
          ) > COUNT(*) FILTER (
            WHERE r.created_at < NOW() - INTERVAL '7 days'
              AND r.created_at >= NOW() - INTERVAL '14 days'
          ) + 1 THEN 12
          ELSE 0
        END
      ) >= 42 THEN 'active'
      WHEN LEAST(
        100,
        (COUNT(*) FILTER (
          WHERE r.created_at >= NOW() - INTERVAL '7 days'
        ) * 16)
        +
        (GREATEST(
          COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '30 days'
          )
          -
          COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
          ),
          0
        ) * 6)
        +
        CASE
          WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 10 THEN 12
          WHEN COALESCE(MAX(pdc.delivery_days_median), pd.avg_days) >= 7 THEN 10
          ELSE 0
        END
        +
        CASE
          WHEN COUNT(*) FILTER (
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
          ) > COUNT(*) FILTER (
            WHERE r.created_at < NOW() - INTERVAL '7 days'
              AND r.created_at >= NOW() - INTERVAL '14 days'
          ) + 1 THEN 12
          ELSE 0
        END
      ) >= 20 THEN 'building'
      ELSE 'low'
    END AS pressure_level,
    MAX(r.created_at) AS last_report_at,
    NOW() AS updated_at
  FROM public.pin_data pd
  LEFT JOIN public.reports r
    ON r.pin = pd.pin
    AND r.is_hidden IS NOT TRUE
  LEFT JOIN public.pin_delivery_confidence pdc
    ON pdc.pin = pd.pin
  GROUP BY pd.pin, pd.city, pd.state, pd.avg_days
  ON CONFLICT (pin) DO UPDATE
  SET
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    report_count_7d = EXCLUDED.report_count_7d,
    report_count_30d = EXCLUDED.report_count_30d,
    trend_direction = EXCLUDED.trend_direction,
    pressure_score = EXCLUDED.pressure_score,
    pressure_level = EXCLUDED.pressure_level,
    last_report_at = EXCLUDED.last_report_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

COMMENT ON FUNCTION public.refresh_track_confidence_snapshots IS
  'Rebuilds pin_delivery_confidence and pin_supply_pressure from reports + pin_data.';
