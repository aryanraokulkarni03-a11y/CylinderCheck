-- ============================================
-- CylinderCheck - Scrape governance hardening
-- Date: 2026-03-29
-- Purpose:
--   1. Ensure scrape health views run with security invoker semantics.
--   2. Revoke public access to scrape health views explicitly.
-- ============================================

BEGIN;

ALTER VIEW public.scrape_job_health_v1
  SET (security_invoker = true);

ALTER VIEW public.scrape_source_health_v1
  SET (security_invoker = true);

REVOKE ALL ON TABLE public.scrape_job_health_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.scrape_source_health_v1 FROM PUBLIC, anon, authenticated;

COMMIT;
