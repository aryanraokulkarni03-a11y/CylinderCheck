-- CylinderCheck security hardening
-- Apply after the base schema and live-contract migrations.

-- 1. Make auth notification logs private.
ALTER TABLE public.auth_notification_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_notification_log'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.auth_notification_log',
      pol.policyname
    );
  END LOOP;
END $$;

-- 2. Keep read-only public data explicit under RLS.
ALTER TABLE public.pin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lpg_prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_data'
      AND policyname = 'Anyone can read pin data'
  ) THEN
    CREATE POLICY "Anyone can read pin data"
      ON public.pin_data
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lpg_prices'
      AND policyname = 'Anyone can read LPG prices'
  ) THEN
    CREATE POLICY "Anyone can read LPG prices"
      ON public.lpg_prices
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- 3. Lock mutable function search paths where those public functions exist.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS function_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'check_report_rate_limit',
        'get_avg_delivery_days',
        'refresh_track_confidence_snapshots',
        'touch_scrape_run_updated_at',
        'enforce_pin_user_signal_guardrails'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      fn.schema_name,
      fn.function_name,
      fn.function_args
    );
  END LOOP;
END $$;

-- 4. Dashboard-only follow-up:
--    Authentication -> Settings:
--      - Enable leaked password protection
--    Auth/users tables are not changed here.
