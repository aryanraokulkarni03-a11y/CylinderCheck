-- ============================================
-- CylinderCheck - Seeding the 25-03 DRL Field Intelligence
-- Extracts exact Community Intelligence into unified tables
-- Includes the Baner Domestic vs Commercial split
-- ============================================

BEGIN;

-- 1. Register base PIN profiles to unlock Foreign Keys
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

INSERT INTO public.pin_profiles (pin, canonical_city, canonical_state, canonical_area, city_source, state_source, area_source, profile_confidence) VALUES
  ('226010', 'Lucknow', 'Uttar Pradesh', 'Lucknow Area', 'seed', 'seed', 'seed', 'high'),
  ('700086', 'Kolkata', 'West Bengal', 'Baghajatin',   'seed', 'seed', 'seed', 'high'),
  ('700032', 'Kolkata', 'West Bengal', 'Jadavpur',     'seed', 'seed', 'seed', 'high'),
  ('700019', 'Kolkata', 'West Bengal', 'Ballygunge',   'seed', 'seed', 'seed', 'high'),
  ('700084', 'Kolkata', 'West Bengal', 'Garia',        'seed', 'seed', 'seed', 'high'),
  ('700103', 'Kolkata', 'West Bengal', 'Hiland Park',  'seed', 'seed', 'seed', 'high'),
  ('700034', 'Kolkata', 'West Bengal', 'Behala',       'seed', 'seed', 'seed', 'high'),
  ('700033', 'Kolkata', 'West Bengal', 'Tollygunge',   'seed', 'seed', 'seed', 'high'),
  ('700008', 'Kolkata', 'West Bengal', 'Barisha',      'seed', 'seed', 'seed', 'high'),
  ('700060', 'Kolkata', 'West Bengal', 'Parnasree',    'seed', 'seed', 'seed', 'high'),
  ('700053', 'Kolkata', 'West Bengal', 'New Alipore',  'seed', 'seed', 'seed', 'high'),
  ('411045', 'Pune',    'Maharashtra', 'Baner',         'seed', 'seed', 'seed', 'high'),
  ('411057', 'Pune',    'Maharashtra',   'Wakad',        'seed', 'seed', 'seed', 'high')
ON CONFLICT (pin) DO UPDATE SET 
  canonical_area = EXCLUDED.canonical_area,
  updated_at = NOW();

-- 2. Inject Delivery Confidence Models (Historical Days Pipeline)
INSERT INTO public.pin_delivery_confidence (pin, city, state, product_type, historical_avg_days, confidence_level, freshness_status, source_scope) VALUES
  ('226010', 'Lucknow', 'Uttar Pradesh', 'domestic_14_2kg', 5.0,  'high', 'fresh', 'historical'),
  ('700086', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 12.0, 'high', 'fresh', 'historical'),
  ('700032', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 14.0, 'high', 'fresh', 'historical'),
  ('700019', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 12.0, 'high', 'fresh', 'historical'),
  ('700084', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 9.0,  'high', 'fresh', 'historical'),
  ('700103', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 9.0,  'high', 'fresh', 'historical'),
  ('700034', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 11.0, 'high', 'fresh', 'historical'),
  ('700033', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 11.0, 'high', 'fresh', 'historical'),
  ('700008', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 11.0, 'high', 'fresh', 'historical'),
  ('700060', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 9.0,  'high', 'fresh', 'historical'),
  ('700053', 'Kolkata', 'West Bengal',   'domestic_14_2kg', 9.0,  'high', 'fresh', 'historical'),
  ('411057', 'Pune',    'Maharashtra',   'commercial_19kg', 22.0, 'high', 'fresh', 'historical'),
  ('411045', 'Pune',    'Maharashtra',   'domestic_14_2kg', 1.0,  'high', 'fresh', 'historical'),
  ('411045', 'Pune',    'Maharashtra',   'commercial_19kg', 22.0, 'high', 'fresh', 'historical')
ON CONFLICT (pin, product_type) DO UPDATE SET 
  historical_avg_days  = EXCLUDED.historical_avg_days,
  confidence_level     = EXCLUDED.confidence_level,
  freshness_status     = EXCLUDED.freshness_status,
  source_scope         = EXCLUDED.source_scope;

-- 3. Inject Signal Pressure Profiles (UI Hotspot Mapping)
INSERT INTO public.pin_supply_pressure (pin, product_type, pressure_score, pressure_level, trend_direction) VALUES
  ('226010', 'domestic_14_2kg', 30, 'building', 'rising'),
  ('700086', 'domestic_14_2kg', 75, 'severe', 'rising'),
  ('700032', 'domestic_14_2kg', 75, 'severe', 'rising'),
  ('700019', 'domestic_14_2kg', 72, 'severe', 'rising'),
  ('700084', 'domestic_14_2kg', 45, 'active', 'steady'),
  ('700103', 'domestic_14_2kg', 45, 'active', 'steady'),
  ('700034', 'domestic_14_2kg', 72, 'severe', 'rising'),
  ('700033', 'domestic_14_2kg', 72, 'severe', 'rising'),
  ('700008', 'domestic_14_2kg', 72, 'severe', 'rising'),
  ('700060', 'domestic_14_2kg', 45, 'active', 'steady'),
  ('700053', 'domestic_14_2kg', 45, 'active', 'steady'),
  ('411057', 'commercial_19kg', 75, 'severe', 'rising'),
  -- The CRITICAL Baner Split (411045):
  ('411045', 'domestic_14_2kg', 4,  'low',    'easing'),
  ('411045', 'commercial_19kg', 72, 'severe', 'rising')
ON CONFLICT (pin, product_type) DO UPDATE SET 
  pressure_score  = EXCLUDED.pressure_score,
  pressure_level  = EXCLUDED.pressure_level,
  trend_direction = EXCLUDED.trend_direction;

COMMIT;
