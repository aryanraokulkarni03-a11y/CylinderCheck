-- CylinderCheck: Vendor verification fields (Commercial listings)
-- Run in Supabase Dashboard -> SQL Editor.

-- Adds optional fields so the UI can show "Verified license" only when explicitly marked.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add a safe CHECK constraint (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendors_verification_status_check'
  ) THEN
    ALTER TABLE public.vendors
      ADD CONSTRAINT vendors_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

