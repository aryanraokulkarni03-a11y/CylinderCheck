-- ============================================
-- CylinderCheck - Track Security Advisor fix
-- Date: 2026-03-26
-- Purpose:
--   1. Enable RLS on public Track snapshot tables flagged by Supabase Security Advisor.
--   2. Add explicit public read policies for the Track read model.
--   3. Make pin_track_summary_v1 obey underlying table policies via security_invoker.
-- ============================================

BEGIN;

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

ALTER VIEW public.pin_track_summary_v1 SET (security_invoker = true);

COMMIT;
