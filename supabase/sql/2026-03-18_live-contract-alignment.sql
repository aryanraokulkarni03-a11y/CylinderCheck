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
      WITH CHECK (true);
  END IF;
END $$;

-- Production currently also contains:
--   public.feedback
--   public.price_corrections
--   public.report_votes
-- Keep those tables live as-is until their exact column contract is
-- mirrored into repo migrations.
