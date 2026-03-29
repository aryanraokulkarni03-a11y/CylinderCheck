-- ============================================
-- CylinderCheck - Repo contract alignment
-- Date: 2026-03-29
-- Purpose:
--   1. Mirror live vendor contract into repo-managed SQL.
--   2. Add repo-owned feedback and price correction intake tables.
--   3. Reduce schema drift before Phase 3E backend work.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.vendors (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  category           TEXT NOT NULL DEFAULT 'other',
  city               TEXT NOT NULL,
  tagline            TEXT,
  description        TEXT,
  whatsapp           TEXT,
  phone              TEXT,
  website            TEXT,
  active             BOOLEAN NOT NULL DEFAULT true,
  featured           BOOLEAN NOT NULL DEFAULT false,
  listing_expires_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  license_number     TEXT,
  verified_at        TIMESTAMPTZ,
  verification_notes TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vendors_category_check
    CHECK (category IN ('induction', 'electric', 'kerosene', 'png', 'other')),
  CONSTRAINT vendors_verification_status_check
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  CONSTRAINT vendors_name_length_check
    CHECK (char_length(name) <= 200),
  CONSTRAINT vendors_city_length_check
    CHECK (char_length(city) <= 120),
  CONSTRAINT vendors_tagline_length_check
    CHECK (tagline IS NULL OR char_length(tagline) <= 240),
  CONSTRAINT vendors_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 4000),
  CONSTRAINT vendors_website_length_check
    CHECK (website IS NULL OR char_length(website) <= 500),
  CONSTRAINT vendors_license_length_check
    CHECK (license_number IS NULL OR char_length(license_number) <= 120)
);

CREATE INDEX IF NOT EXISTS vendors_city_idx
  ON public.vendors (city);

CREATE INDEX IF NOT EXISTS vendors_active_verification_idx
  ON public.vendors (active, verification_status, featured);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendors'
      AND policyname = 'Anyone can read active vendors'
  ) THEN
    CREATE POLICY "Anyone can read active vendors"
      ON public.vendors
      FOR SELECT
      USING (active = true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.feedback (
  id               BIGSERIAL PRIMARY KEY,
  contact          TEXT,
  channel          TEXT NOT NULL DEFAULT 'email',
  topic            TEXT NOT NULL DEFAULT 'general',
  subject          TEXT,
  message          TEXT NOT NULL,
  route            TEXT,
  city             TEXT,
  pin              TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'new',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_channel_check
    CHECK (channel IN ('email', 'support_form', 'manual')),
  CONSTRAINT feedback_topic_check
    CHECK (topic IN ('general', 'billing', 'data_correction', 'vendor_listing', 'account_access', 'product_feedback')),
  CONSTRAINT feedback_status_check
    CHECK (status IN ('new', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT feedback_message_length_check
    CHECK (char_length(message) <= 4000),
  CONSTRAINT feedback_subject_length_check
    CHECK (subject IS NULL OR char_length(subject) <= 240),
  CONSTRAINT feedback_route_length_check
    CHECK (route IS NULL OR char_length(route) <= 240),
  CONSTRAINT feedback_city_length_check
    CHECK (city IS NULL OR char_length(city) <= 120),
  CONSTRAINT feedback_pin_check
    CHECK (pin IS NULL OR pin ~ '^[0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS feedback_status_created_at_idx
  ON public.feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_topic_created_at_idx
  ON public.feedback (topic, created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feedback'
      AND policyname = 'Public can insert feedback'
  ) THEN
    CREATE POLICY "Public can insert feedback"
      ON public.feedback
      FOR INSERT
      WITH CHECK (
        nullif(btrim(message), '') IS NOT NULL
        AND (contact IS NULL OR nullif(btrim(contact), '') IS NOT NULL)
        AND (subject IS NULL OR char_length(subject) <= 240)
        AND (route IS NULL OR nullif(btrim(route), '') IS NOT NULL)
        AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
        AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.price_corrections (
  id                    BIGSERIAL PRIMARY KEY,
  city                  TEXT,
  state                 TEXT,
  pin                   TEXT,
  product_type          TEXT,
  reported_price        NUMERIC(7,2),
  current_display_price NUMERIC(7,2),
  source_url            TEXT,
  correction_note       TEXT NOT NULL,
  reporter_contact      TEXT,
  reporter_name         TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT price_corrections_product_type_check
    CHECK (
      product_type IS NULL
      OR product_type IN ('domestic_14_2kg', 'commercial_19kg')
    ),
  CONSTRAINT price_corrections_status_check
    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  CONSTRAINT price_corrections_pin_check
    CHECK (pin IS NULL OR pin ~ '^[0-9]{6}$'),
  CONSTRAINT price_corrections_note_length_check
    CHECK (char_length(correction_note) <= 4000),
  CONSTRAINT price_corrections_city_length_check
    CHECK (city IS NULL OR char_length(city) <= 120),
  CONSTRAINT price_corrections_state_length_check
    CHECK (state IS NULL OR char_length(state) <= 120),
  CONSTRAINT price_corrections_source_length_check
    CHECK (source_url IS NULL OR char_length(source_url) <= 500)
);

CREATE INDEX IF NOT EXISTS price_corrections_status_created_at_idx
  ON public.price_corrections (status, created_at DESC);

CREATE INDEX IF NOT EXISTS price_corrections_city_product_idx
  ON public.price_corrections (city, product_type, created_at DESC);

ALTER TABLE public.price_corrections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'price_corrections'
      AND policyname = 'Public can insert price corrections'
  ) THEN
    CREATE POLICY "Public can insert price corrections"
      ON public.price_corrections
      FOR INSERT
      WITH CHECK (
        nullif(btrim(correction_note), '') IS NOT NULL
        AND (city IS NULL OR nullif(btrim(city), '') IS NOT NULL)
        AND (state IS NULL OR nullif(btrim(state), '') IS NOT NULL)
        AND (pin IS NULL OR pin ~ '^[0-9]{6}$')
        AND (reporter_contact IS NULL OR nullif(btrim(reporter_contact), '') IS NOT NULL)
        AND (reporter_name IS NULL OR nullif(btrim(reporter_name), '') IS NOT NULL)
      );
  END IF;
END $$;

COMMIT;
