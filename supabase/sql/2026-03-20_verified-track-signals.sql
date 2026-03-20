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
  CONSTRAINT pin_user_signals_pressure_check
    CHECK (pressure_level IS NULL OR pressure_level IN ('low', 'building', 'active', 'severe')),
  CONSTRAINT pin_user_signals_payload_check
    CHECK (delivery_days IS NOT NULL OR pressure_level IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS pin_user_signals_pin_idx
  ON public.pin_user_signals (pin);

CREATE INDEX IF NOT EXISTS pin_user_signals_pin_prefix3_idx
  ON public.pin_user_signals (pin_prefix3);

CREATE INDEX IF NOT EXISTS pin_user_signals_active_idx
  ON public.pin_user_signals (active, expires_at);

CREATE INDEX IF NOT EXISTS pin_user_signals_user_idx
  ON public.pin_user_signals (user_id, created_at DESC);

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
