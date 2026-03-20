-- ============================================
-- CylinderCheck - Track signal trust guardrails
-- Adds trust metadata and insert cooldown protection.
-- ============================================

ALTER TABLE public.pin_user_signals
  ADD COLUMN IF NOT EXISTS trust_tier TEXT NOT NULL DEFAULT 'signed_in_user',
  ADD COLUMN IF NOT EXISTS source_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pin_user_signals_trust_tier_check'
  ) THEN
    ALTER TABLE public.pin_user_signals
      ADD CONSTRAINT pin_user_signals_trust_tier_check
      CHECK (trust_tier IN ('signed_in_user', 'repeat_local_contributor', 'trusted_contributor', 'verified_local_contributor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pin_user_signals_user_pin_created_idx
  ON public.pin_user_signals (user_id, pin, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_pin_user_signal_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pin_user_signals_guardrails_before_insert
  ON public.pin_user_signals;

CREATE TRIGGER pin_user_signals_guardrails_before_insert
  BEFORE INSERT ON public.pin_user_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pin_user_signal_guardrails();
