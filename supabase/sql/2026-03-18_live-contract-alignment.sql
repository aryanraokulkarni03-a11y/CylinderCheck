-- CylinderCheck: align checked-in schema with live production tables
-- Verified against project ref acrfamphpbnhbdycbtjn on 2026-03-18.

-- Paid subscriptions used by verify-payment + get-admin-stats.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  BIGSERIAL PRIMARY KEY,
  contact             TEXT,
  pin                 TEXT,
  razorpay_order_id   TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  razorpay_signature  TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active',
  amount              INT NOT NULL DEFAULT 4900,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Commercial lead capture used by the waitlist / quote form.
CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id              BIGSERIAL PRIMARY KEY,
  business_name   TEXT NOT NULL,
  business_type   TEXT NOT NULL,
  city            TEXT,
  pin             TEXT,
  phone           TEXT NOT NULL,
  need_type       TEXT NOT NULL,
  cylinders_week  INT,
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'commercial_leads'
      AND policyname = 'Public can insert commercial leads'
  ) THEN
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
  END IF;
END $$;

-- Production currently also contains:
--   public.feedback
--   public.price_corrections
--   public.report_votes
-- Keep those tables live as-is until their exact column contract is
-- mirrored into repo migrations.
