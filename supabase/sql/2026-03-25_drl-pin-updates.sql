-- ============================================
-- CylinderCheck - Seeding the 25-03 DRL Field Intelligence
-- Extracts exact Community Intelligence into unified tables
-- Includes the Baner Domestic vs Commercial split
-- ============================================

BEGIN;

-- 1. Register base PIN profiles to unlock Foreign Keys
INSERT INTO public.pin_profiles (pin, city, area_name, is_hotspot) VALUES
  ('226010', 'Lucknow', 'Lucknow Area', false),
  ('700086', 'Kolkata', 'Baghajatin', true),
  ('700032', 'Kolkata', 'Jadavpur', true),
  ('700019', 'Kolkata', 'Ballygunge', true),
  ('700084', 'Kolkata', 'Garia', false),
  ('700103', 'Kolkata', 'Hiland Park', false),
  ('700034', 'Kolkata', 'Behala', true),
  ('700033', 'Kolkata', 'Tollygunge', true),
  ('700008', 'Kolkata', 'Barisha', true),
  ('700060', 'Kolkata', 'Parnasree', false),
  ('700053', 'Kolkata', 'New Alipore', false),
  ('411057', 'Pune',    'Wakad', true)
ON CONFLICT (pin) DO UPDATE SET 
  area_name = EXCLUDED.area_name,
  is_hotspot = EXCLUDED.is_hotspot;

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
