-- ============================================
-- CylinderCheck - News editorial workflow
-- Date: 2026-03-30
-- Purpose:
--   1. Add authenticated editorial admin registry.
--   2. Add audit fields for review/publish lifecycle.
--   3. Enforce one publication row per candidate.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.news_editorial_admins (
  user_id     UUID PRIMARY KEY,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT news_editorial_admins_role_check
    CHECK (role IN ('editor', 'publisher', 'admin'))
);

ALTER TABLE public.news_editorial_admins ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.news_article_candidates
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.news_article_publications
  ADD COLUMN IF NOT EXISTS published_by_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS news_article_publications_candidate_idx
  ON public.news_article_publications (candidate_id);

CREATE OR REPLACE FUNCTION public.touch_news_editorial_admins_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_editorial_admins_set_updated_at
  ON public.news_editorial_admins;

CREATE TRIGGER news_editorial_admins_set_updated_at
  BEFORE UPDATE ON public.news_editorial_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_news_editorial_admins_updated_at();

COMMIT;
