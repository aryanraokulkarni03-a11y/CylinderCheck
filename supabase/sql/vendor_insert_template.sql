-- CylinderCheck: Vendor insert template (Commercial listings)
-- Run in Supabase Dashboard -> SQL Editor (service role context).
--
-- Notes:
-- - `city` must match the commercial city allowlist in the frontend.
-- - Keep `verification_status` as 'unverified' unless you have verified the license.

INSERT INTO public.vendors (
  name,
  category,
  city,
  tagline,
  description,
  whatsapp,
  phone,
  website,
  active,
  featured,
  listing_expires_at,
  verification_status,
  license_number,
  verified_at,
  verification_notes
)
VALUES (
  '<VENDOR_NAME>',
  'other',
  '<CITY>',
  '<ONE_LINE_PITCH>',
  '<DETAILS>',
  '<WHATSAPP_E164>', -- e.g. "919000000001"
  '<PHONE_E164>',    -- e.g. "919000000001"
  '<WEBSITE_OR_NULL>',
  true,
  false,
  NULL,
  'unverified',
  NULL,
  NULL,
  NULL
);

