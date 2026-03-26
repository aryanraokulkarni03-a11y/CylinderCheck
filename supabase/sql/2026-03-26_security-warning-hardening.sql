-- ============================================
-- CylinderCheck - Security Advisor warning hardening
-- Date: 2026-03-26
-- Purpose:
--   1. Pin mutable public function search_path values.
--   2. Replace permissive public INSERT policies with explicit checks.
--   3. Align the live database with the repo-managed schema.
-- ============================================

BEGIN;

ALTER FUNCTION public.refresh_track_confidence_snapshots()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.touch_scrape_run_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.enforce_pin_user_signal_guardrails()
  SET search_path = public, pg_temp;

DROP POLICY IF EXISTS "Anyone can insert report" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can insert report" ON public.reports;

CREATE POLICY "Authenticated users can insert report"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND pin ~ '^[0-9]{6}$'
    AND nullif(btrim(issue), '') IS NOT NULL
    AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
    AND (delivery_days IS NULL OR (delivery_days >= 1 AND delivery_days <= 30))
    AND (company IS NULL OR company IN ('IndianOil', 'HP Gas', 'Bharat Gas'))
  );

DROP POLICY IF EXISTS "Public can insert subscription" ON public.alert_subscriptions;

CREATE POLICY "Public can insert subscription"
  ON public.alert_subscriptions
  FOR INSERT
  WITH CHECK (
    nullif(btrim(contact), '') IS NOT NULL
    AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
    AND (last_booking IS NULL OR last_booking <= CURRENT_DATE)
    AND alert_type IN ('free', 'plus', 'annual')
    AND channel IN ('email', 'sms', 'whatsapp')
    AND plan_code IN ('free', 'plus_monthly', 'plus_annual', 'annual')
    AND delivery_status IN ('pending', 'needs_booking_date', 'scheduled', 'sent', 'failed')
    AND reminder_type IN ('booking_d_minus_2')
  );

DROP POLICY IF EXISTS "Public can insert commercial leads" ON public.commercial_leads;

CREATE POLICY "Public can insert commercial leads"
  ON public.commercial_leads
  FOR INSERT
  WITH CHECK (
    nullif(btrim(business_name), '') IS NOT NULL
    AND nullif(btrim(business_type), '') IS NOT NULL
    AND nullif(btrim(phone), '') IS NOT NULL
    AND nullif(btrim(need_type), '') IS NOT NULL
    AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
    AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
    AND business_type IN ('restaurant', 'hotel', 'dhaba', 'bakery', 'catering', 'cloud_kitchen', 'other')
    AND need_type IN ('induction', 'electric', 'kerosene', 'png', 'not_sure', 'other')
    AND (cylinders_week IS NULL OR (cylinders_week >= 1 AND cylinders_week <= 1000))
    AND (message IS NULL OR char_length(message) <= 2000)
  );

COMMIT;
