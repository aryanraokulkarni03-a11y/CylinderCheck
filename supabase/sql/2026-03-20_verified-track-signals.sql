-- ============================================
-- CylinderCheck - Verified Track signals
-- Structured user inputs for delivery + supply pressure.
-- ============================================

CREATE TABLE IF NOT EXISTS public.pin_user_signals (
  id              BIGSERIAL PRIMARY KEY,
  pin             TEXT NOT NULL,
  pin_prefix3     TEXT GENERATED ALWAYS AS (left(pin, 3)) STORED,
  city            TEXT,
  state           TEXT,
  area            TEXT,
  user_id         UUID NOT NULL,
  user_email      TEXT,
  trust_tier      TEXT NOT NULL DEFAULT 'signed_in_user',
  source_weight   NUMERIC(4,2) NOT NULL DEFAULT 0.55,
  delivery_days   INT,
  pressure_level  TEXT,
  note            TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '21 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pin_user_signals_pin_check
    CHECK (pin ~ '^[0-9]{6}$'),
  CONSTRAINT pin_user_signals_delivery_days_check
    CHECK (delivery_days IS NULL OR (delivery_days >= 1 AND delivery_days <= 30)),
  CONSTRAINT pin_user_signals_trust_tier_check
    CHECK (trust_tier IN ('signed_in_user', 'repeat_local_contributor', 'trusted_contributor', 'verified_local_contributor')),
  CONSTRAINT pin_user_signals_pressure_check
    CHECK (pressure_level IS NULL OR pressure_level IN ('low', 'building', 'active', 'severe')),
  CONSTRAINT pin_user_signals_payload_check
    CHECK (delivery_days IS NOT NULL OR pressure_level IS NOT NULL)
);

ALTER TABLE public.pin_user_signals
  ADD COLUMN IF NOT EXISTS trust_tier TEXT NOT NULL DEFAULT 'signed_in_user',
  ADD COLUMN IF NOT EXISTS source_weight NUMERIC(4,2) NOT NULL DEFAULT 0.55;

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

CREATE INDEX IF NOT EXISTS pin_user_signals_pin_idx
  ON public.pin_user_signals (pin);

CREATE INDEX IF NOT EXISTS pin_user_signals_pin_prefix3_idx
  ON public.pin_user_signals (pin_prefix3);

CREATE INDEX IF NOT EXISTS pin_user_signals_active_idx
  ON public.pin_user_signals (active, expires_at);

CREATE INDEX IF NOT EXISTS pin_user_signals_user_idx
  ON public.pin_user_signals (user_id, created_at DESC);

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

ALTER TABLE public.pin_user_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_user_signals'
      AND policyname = 'Authenticated users can insert own track signals'
  ) THEN
    CREATE POLICY "Authenticated users can insert own track signals"
      ON public.pin_user_signals
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pin_user_signals'
      AND policyname = 'Authenticated users can read own track signals'
  ) THEN
    CREATE POLICY "Authenticated users can read own track signals"
      ON public.pin_user_signals
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
