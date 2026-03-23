-- ============================================
-- CylinderCheck — PIN Code Intelligence Seed
-- Source: daily_review_log.md (PIN Code Intelligence section)
--         Community-verified field data from Reddit, 2026-03-21
-- Run in: Supabase Dashboard → SQL Editor
--
-- SAFE TO RE-RUN: all upserts use ON CONFLICT guards.
-- Sections:
--   1. pin_data             — base avg_days, shortage flag, trend
--   2. pin_profiles         — canonical city / state / area  (seed confidence: high)
--   3. snapshot refresh     — rebuilds pin_delivery_confidence + pin_supply_pressure
--                             → feeds pin_track_summary_v1 → Booking Tracker UI
-- ============================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — pin_data
--   avg_days : midpoint of DRL delivery estimate range
--   shortage  : true  → HIGH pressure area
--   trend     : 'worsening' → HIGH | 'stable' → MODERATE | 'improving' → LOW
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.pin_data (pin, city, state, agency, avg_days, shortage, trend) VALUES

  -- ── Kolkata (HIGH PRESSURE — ECA freeze, cascading shortages) ─────────────
  -- Source: Batches 2, 5, 16 (r/kolkata). ECA invoked. Induction cooktops OOS.
  --   Salt Lake Sector V — ~7 days domestic / ~30 days commercial
  ('700091', 'Kolkata',  'West Bengal', 'IndianOil',  7.0,  true,  'worsening'),
  --   New Town — similar profile, eateries reverting to charcoal
  ('700156', 'Kolkata',  'West Bengal', 'IndianOil',  7.0,  true,  'worsening'),
  --   South Kolkata — Ballygunge / Jadavpur (25-30 day commercial crush)
  ('700019', 'Kolkata',  'West Bengal', 'IndianOil', 27.5,  true,  'worsening'),
  ('700032', 'Kolkata',  'West Bengal', 'IndianOil', 27.5,  true,  'worsening'),

  -- ── Pune (MIXED — domestic okay, commercial critical, some black marketing) ─
  -- Source: Batches 3, 4, 7, 14, 19 (r/pune)
  --   Kothrud (PMC) — confirmed 3-day domestic delivery
  ('411038', 'Pune', 'Maharashtra', 'Bharat Gas',  3.0, false, 'improving'),
  --   Hadapsar (PMC) — booked 10th, delivered 18th (4d invoice + 4d delivery)
  ('411028', 'Pune', 'Maharashtra', 'Bharat Gas',  8.0, false, 'stable'),
  --   Baner (PMC) — commercial 20-25 day crisis
  ('411045', 'Pune', 'Maharashtra', 'Bharat Gas', 22.5,  true,  'worsening'),
  --   Wakad (PCMC) — commercial + suspected agency-level black marketing
  ('411057', 'Pune', 'Maharashtra', 'Bharat Gas', 22.5,  true,  'worsening'),
  --   Sangvi / Pimple Saudagar — 11-12 day live domestic delay (Batch 19)
  --   User confirmed PIN 411027 explicitly. Agency black market suspicion raised.
  ('411027', 'Pune', 'Maharashtra', 'Bharat Gas', 11.5,  true,  'worsening'),

  -- ── Jaipur (MODERATE-HIGH — acute local gaps, 7-day baseline) ────────────
  -- Source: Batches 9, 25 (r/jaipur). 5kg emergency search + 7-day Bharatgas delivery.
  --   Jagatpura / Malviya Nagar — shared PIN, emergency 5kg search active
  ('302017', 'Jaipur', 'Rajasthan', 'HP Gas', 10.0,  true,  'worsening'),
  --   Vaishali Nagar — moderate, no direct shortage signal yet, monitor
  ('302021', 'Jaipur', 'Rajasthan', 'HP Gas',  7.0, false,  'stable'),
  --   Mansarovar — moderate, no direct shortage signal yet, monitor
  ('302020', 'Jaipur', 'Rajasthan', 'HP Gas',  7.0, false,  'stable'),

  -- ── Bengaluru (LOW-MODERATE — currently stable, baseline only) ──────────
  -- Source: Original r/bangalore context. No critical shortage signals yet.
  ('560102', 'Bengaluru', 'Karnataka', 'HP Gas',  5.0, false, 'stable'),
  ('560038', 'Bengaluru', 'Karnataka', 'HP Gas',  5.0, false, 'stable'),
  ('560066', 'Bengaluru', 'Karnataka', 'HP Gas',  7.5, false, 'stable'),
  ('560064', 'Bengaluru', 'Karnataka', 'HP Gas',  4.0, false, 'improving'),

  -- ── Lucknow (LOW — domestic very fast, congestion looming) ───────────────
  -- Source: Batches 20, 23 (r/lucknow). Delivery agent said internal congestion bad.
  --   Nishatganj — ~2 day delivery, Indane issued ₹25 SLA refund (UPI Preferred Booking)
  ('226006', 'Lucknow', 'Uttar Pradesh', 'IndianOil', 2.0, false, 'improving')

ON CONFLICT (pin) DO UPDATE SET
  city       = EXCLUDED.city,
  state      = EXCLUDED.state,
  agency     = EXCLUDED.agency,
  avg_days   = EXCLUDED.avg_days,
  shortage   = EXCLUDED.shortage,
  trend      = EXCLUDED.trend,
  updated_at = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — pin_profiles
--   Canonical city/state/area so the Track tab can display area-level labels
--   and the neighbor-edge graph can cluster PINs correctly.
--   city_source = state_source = 'seed' → profile_confidence = 'high'
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.pin_profiles (
  pin,
  canonical_city,
  canonical_state,
  canonical_area,
  city_source,
  state_source,
  area_source,
  profile_confidence,
  updated_at
) VALUES

  -- Kolkata
  ('700091', 'Kolkata', 'West Bengal', 'Salt Lake Sector V',       'seed', 'seed', 'seed', 'high', NOW()),
  ('700156', 'Kolkata', 'West Bengal', 'New Town',                 'seed', 'seed', 'seed', 'high', NOW()),
  ('700019', 'Kolkata', 'West Bengal', 'Ballygunge',               'seed', 'seed', 'seed', 'high', NOW()),
  ('700032', 'Kolkata', 'West Bengal', 'Jadavpur',                 'seed', 'seed', 'seed', 'high', NOW()),

  -- Pune
  ('411038', 'Pune', 'Maharashtra', 'Kothrud',                     'seed', 'seed', 'seed', 'high', NOW()),
  ('411028', 'Pune', 'Maharashtra', 'Hadapsar',                    'seed', 'seed', 'seed', 'high', NOW()),
  ('411045', 'Pune', 'Maharashtra', 'Baner',                       'seed', 'seed', 'seed', 'high', NOW()),
  ('411057', 'Pune', 'Maharashtra', 'Wakad',                       'seed', 'seed', 'seed', 'high', NOW()),
  ('411027', 'Pune', 'Maharashtra', 'Sangvi',                      'seed', 'seed', 'seed', 'high', NOW()),

  -- Jaipur
  ('302017', 'Jaipur', 'Rajasthan',  'Jagatpura',                  'seed', 'seed', 'seed', 'high', NOW()),
  ('302021', 'Jaipur', 'Rajasthan',  'Vaishali Nagar',             'seed', 'seed', 'seed', 'high', NOW()),
  ('302020', 'Jaipur', 'Rajasthan',  'Mansarovar',                 'seed', 'seed', 'seed', 'high', NOW()),

  -- Bengaluru
  ('560102', 'Bengaluru', 'Karnataka', 'HSR Layout',               'seed', 'seed', 'seed', 'high', NOW()),
  ('560038', 'Bengaluru', 'Karnataka', 'Indiranagar',              'seed', 'seed', 'seed', 'high', NOW()),
  ('560066', 'Bengaluru', 'Karnataka', 'Whitefield',               'seed', 'seed', 'seed', 'high', NOW()),
  ('560064', 'Bengaluru', 'Karnataka', 'Yelahanka',                'seed', 'seed', 'seed', 'high', NOW()),

  -- Lucknow
  ('226006', 'Lucknow', 'Uttar Pradesh', 'Nishatganj',             'seed', 'seed', 'seed', 'high', NOW())

ON CONFLICT (pin) DO UPDATE SET
  canonical_city     = EXCLUDED.canonical_city,
  canonical_state    = EXCLUDED.canonical_state,
  canonical_area     = EXCLUDED.canonical_area,
  city_source        = EXCLUDED.city_source,
  state_source       = EXCLUDED.state_source,
  area_source        = EXCLUDED.area_source,
  profile_confidence = EXCLUDED.profile_confidence,
  updated_at         = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 + 3.5 — Ordering note
--   Section 4 (refresh) runs FIRST to establish base snapshot rows.
--   Section 3.5 (below) runs AFTER to correct supply pressure for pins the
--   refresh cannot source from live signals. See Section 3.5 after the refresh.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — Snapshot refresh
--   Calls refresh_track_confidence_snapshots() which:
--   1. refresh_pin_profiles()           — canonical city/state/area for all pins
--   2. refresh_pin_contributor_profiles() — trust ladder
--   3. refresh_pin_neighbor_edges()     — re-derives same-city edges from pin_profiles
--   4. Populates pin_delivery_confidence — historical_avg_days = pin_data.avg_days
--      delivery_days_median = NULL for pins with no live signals (correct fallback)
--   5. Populates pin_supply_pressure — pressure_level = 'limited' for pins
--      with no live reports/signals → Section 3.5 fixes this.
-- ─────────────────────────────────────────────────────────────────────────────


SELECT public.refresh_track_confidence_snapshots();


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3.5 — Bootstrap supply pressure correction  (runs AFTER Section 4)
--
-- WHY: refresh_track_confidence_snapshots() sets pressure_level = 'limited'
-- for every PIN with zero live reports/signals. It never reads pin_data.shortage
-- or pin_data.trend. Without this fix, HIGH-pressure PINs (Kolkata x4, Pune
-- Baner/Wakad/Sangvi, Jaipur Jagatpura) show "Evidence still building" in the
-- UI — actively wrong given the DRL community intelligence.
--
-- GUARD: this only updates rows that still have no current signal/report basis:
--   - pressure_level = 'limited'
--   - report_count_30d = 0
--   - exact_signal_count_30d = 0
--   - nearby_signal_count_30d = 0
-- This keeps seeded bootstrap pressure from competing with live evidence once
-- the normal scoring pipeline starts receiving reports/signals.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.pin_supply_pressure (
  pin, city, state,
  report_count_7d, report_count_30d,
  trend_direction,
  pressure_score,
  pressure_level,
  exact_signal_count_30d,
  nearby_signal_count_30d,
  source_scope,
  updated_at
) VALUES
  -- Kolkata — HIGH / worsening → severe (score 72 = above 70 threshold)
  ('700091', 'Kolkata',  'West Bengal',   0, 0, 'rising', 72, 'severe',   0, 0, 'none', NOW()),
  ('700156', 'Kolkata',  'West Bengal',   0, 0, 'rising', 72, 'severe',   0, 0, 'none', NOW()),
  ('700019', 'Kolkata',  'West Bengal',   0, 0, 'rising', 72, 'severe',   0, 0, 'none', NOW()),
  ('700032', 'Kolkata',  'West Bengal',   0, 0, 'rising', 72, 'severe',   0, 0, 'none', NOW()),
  -- Pune Kothrud — LOW / improving → low (score 4)
  ('411038', 'Pune',     'Maharashtra',   0, 0, 'easing',  4, 'low',      0, 0, 'none', NOW()),
  -- Pune Hadapsar — MODERATE / stable → building (score 20)
  ('411028', 'Pune',     'Maharashtra',   0, 0, 'steady', 20, 'building', 0, 0, 'none', NOW()),
  -- Pune Baner — HIGH / worsening → severe (score 72)
  ('411045', 'Pune',     'Maharashtra',   0, 0, 'rising', 72, 'severe',   0, 0, 'none', NOW()),
  -- Pune Wakad — HIGH / worsening → severe (score 72)
  ('411057', 'Pune',     'Maharashtra',   0, 0, 'rising', 72, 'severe',   0, 0, 'none', NOW()),
  -- Pune Sangvi — HIGH / worsening → active (score 48, avg_days=11.5 <15 → not severe)
  ('411027', 'Pune',     'Maharashtra',   0, 0, 'rising', 48, 'active',   0, 0, 'none', NOW()),
  -- Jaipur Jagatpura — HIGH / worsening → active (score 48)
  ('302017', 'Jaipur',   'Rajasthan',     0, 0, 'rising', 48, 'active',   0, 0, 'none', NOW()),
  -- Jaipur Vaishali Nagar — MODERATE / stable → building (score 20)
  ('302021', 'Jaipur',   'Rajasthan',     0, 0, 'steady', 20, 'building', 0, 0, 'none', NOW()),
  -- Jaipur Mansarovar — MODERATE / stable → building (score 20)
  ('302020', 'Jaipur',   'Rajasthan',     0, 0, 'steady', 20, 'building', 0, 0, 'none', NOW()),
  -- Bengaluru HSR Layout — LOW / stable → low (score 4)
  ('560102', 'Bengaluru','Karnataka',     0, 0, 'steady',  4, 'low',      0, 0, 'none', NOW()),
  -- Bengaluru Indiranagar — LOW / stable → low (score 4)
  ('560038', 'Bengaluru','Karnataka',     0, 0, 'steady',  4, 'low',      0, 0, 'none', NOW()),
  -- Bengaluru Whitefield — MODERATE / stable → building (score 20)
  ('560066', 'Bengaluru','Karnataka',     0, 0, 'steady', 20, 'building', 0, 0, 'none', NOW()),
  -- Bengaluru Yelahanka — LOW / improving → low (score 4)
  ('560064', 'Bengaluru','Karnataka',     0, 0, 'easing',  4, 'low',      0, 0, 'none', NOW()),
  -- Lucknow Nishatganj — LOW / improving → low (score 4)
  ('226006', 'Lucknow',  'Uttar Pradesh', 0, 0, 'easing',  4, 'low',      0, 0, 'none', NOW())

ON CONFLICT (pin) DO UPDATE SET
  trend_direction          = EXCLUDED.trend_direction,
  pressure_score           = EXCLUDED.pressure_score,
  pressure_level           = EXCLUDED.pressure_level,
  source_scope             = EXCLUDED.source_scope,
  updated_at               = NOW()
WHERE public.pin_supply_pressure.pressure_level = 'limited'
  AND COALESCE(public.pin_supply_pressure.report_count_30d, 0) = 0
  AND COALESCE(public.pin_supply_pressure.exact_signal_count_30d, 0) = 0
  AND COALESCE(public.pin_supply_pressure.nearby_signal_count_30d, 0) = 0;
-- ^ Guard: only bootstrap rows with no live evidence footprint yet.


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES  (uncomment each block and run to confirm)
-- ─────────────────────────────────────────────────────────────────────────────

-- VQ1 — All 17 PINs in pin_data:
-- SELECT pin, city, state, avg_days, shortage, trend
-- FROM public.pin_data
-- WHERE pin IN (
--   '700091','700156','700019','700032',
--   '411038','411028','411045','411057','411027',
--   '302017','302021','302020',
--   '560102','560038','560066','560064','226006'
-- ) ORDER BY city, pin;

-- VQ2 — Pressure levels after Section 3.5 (expected values in comments):
-- SELECT pin, city, pressure_level, pressure_score, trend_direction
-- FROM public.pin_supply_pressure
-- WHERE pin IN (
--   '700091',   -- expect: severe
--   '411027',   -- expect: active
--   '411038',   -- expect: low
--   '411028',   -- expect: building
--   '411045',   -- expect: severe
--   '302017',   -- expect: active
--   '302021',   -- expect: building
--   '560102',   -- expect: low
--   '226006'    -- expect: low
-- ) ORDER BY city, pin;

-- VQ3 — Unified view (what the Booking Tracker actually reads):
-- SELECT pin, city, area,
--        historical_avg_days, delivery_days_median,
--        pressure_level, delivery_confidence_level, delivery_freshness_status
-- FROM public.pin_track_summary_v1
-- WHERE pin IN ('700091','411027','411038','226006','560102')
-- ORDER BY city, pin;
-- Expected:
--   700091 → historical_avg_days=7.0,  pressure_level='severe'
--   411027 → historical_avg_days=11.5, pressure_level='active'
--   411038 → historical_avg_days=3.0,  pressure_level='low'
--   226006 → historical_avg_days=2.0,  pressure_level='low'
--   560102 → historical_avg_days=5.0,  pressure_level='low'

-- ── END OF MIGRATION ────────────────────────────────────────────────────────
