-- ============================================
-- CylinderCheck - News publication foundation
-- Date: 2026-03-30
-- Purpose:
--   1. Add canonical article candidate storage for scraped news items.
--   2. Add publication storage for review-approved news content.
--   3. Keep the current news feed additive while 3E.5 matures.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.news_article_candidates (
  id                        BIGSERIAL PRIMARY KEY,
  candidate_key             TEXT NOT NULL UNIQUE,
  article_key               TEXT NOT NULL,
  source_key                TEXT NOT NULL CONSTRAINT news_article_candidates_source_key_fkey REFERENCES public.scrape_source_registry(source_key) ON DELETE RESTRICT,
  headline                  TEXT NOT NULL,
  slug                      TEXT NOT NULL,
  deck                      TEXT,
  body_markdown             TEXT,
  body_text                 TEXT,
  hero_image_url            TEXT,
  city                      TEXT,
  state                     TEXT,
  topic_key                 TEXT,
  category                  TEXT NOT NULL,
  canonical_source_url      TEXT NOT NULL,
  source_name               TEXT NOT NULL,
  source_domain             TEXT,
  source_hash               TEXT NOT NULL UNIQUE,
  published_source_at       TIMESTAMPTZ NOT NULL,
  source_confidence         NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  normalization_confidence  NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  review_status             TEXT NOT NULL DEFAULT 'pending',
  publish_status            TEXT NOT NULL DEFAULT 'draft',
  review_notes              TEXT,
  rejection_reason          TEXT,
  metadata_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
  scraped_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT news_article_candidates_review_status_check
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  CONSTRAINT news_article_candidates_publish_status_check
    CHECK (publish_status IN ('draft', 'ready', 'published', 'archived')),
  CONSTRAINT news_article_candidates_source_confidence_check
    CHECK (source_confidence >= 0 AND source_confidence <= 0.999),
  CONSTRAINT news_article_candidates_normalization_confidence_check
    CHECK (normalization_confidence >= 0 AND normalization_confidence <= 0.999)
);

CREATE INDEX IF NOT EXISTS news_article_candidates_review_idx
  ON public.news_article_candidates (review_status, publish_status, created_at DESC);

CREATE INDEX IF NOT EXISTS news_article_candidates_source_idx
  ON public.news_article_candidates (source_key, published_source_at DESC);

CREATE INDEX IF NOT EXISTS news_article_candidates_city_idx
  ON public.news_article_candidates (city, category, published_source_at DESC);

CREATE INDEX IF NOT EXISTS news_article_candidates_slug_idx
  ON public.news_article_candidates (slug);

ALTER TABLE public.news_article_candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.news_article_publications (
  id                    BIGSERIAL PRIMARY KEY,
  candidate_id          BIGINT REFERENCES public.news_article_candidates(id) ON DELETE SET NULL,
  slug                  TEXT NOT NULL UNIQUE,
  headline              TEXT NOT NULL,
  deck                  TEXT,
  body_markdown         TEXT,
  hero_image_url        TEXT,
  city                  TEXT,
  state                 TEXT,
  topic_key             TEXT,
  category              TEXT NOT NULL,
  canonical_source_url  TEXT NOT NULL,
  source_name           TEXT NOT NULL,
  source_domain         TEXT,
  publish_status        TEXT NOT NULL DEFAULT 'published',
  metadata_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT news_article_publications_publish_status_check
    CHECK (publish_status IN ('published', 'archived'))
);

CREATE INDEX IF NOT EXISTS news_article_publications_published_idx
  ON public.news_article_publications (publish_status, published_at DESC);

CREATE INDEX IF NOT EXISTS news_article_publications_city_idx
  ON public.news_article_publications (city, category, published_at DESC);

ALTER TABLE public.news_article_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published news articles"
  ON public.news_article_publications
  FOR SELECT
  USING (publish_status = 'published');

CREATE OR REPLACE FUNCTION public.touch_news_editorial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_article_candidates_set_updated_at
  ON public.news_article_candidates;

CREATE TRIGGER news_article_candidates_set_updated_at
  BEFORE UPDATE ON public.news_article_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_news_editorial_updated_at();

DROP TRIGGER IF EXISTS news_article_publications_set_updated_at
  ON public.news_article_publications;

CREATE TRIGGER news_article_publications_set_updated_at
  BEFORE UPDATE ON public.news_article_publications
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_news_editorial_updated_at();

CREATE OR REPLACE VIEW public.news_review_queue_v1
WITH (security_invoker = true) AS
SELECT
  id,
  candidate_key,
  source_key,
  headline,
  slug,
  city,
  state,
  category,
  source_name,
  source_domain,
  source_confidence,
  normalization_confidence,
  review_status,
  publish_status,
  published_source_at,
  created_at,
  updated_at
FROM public.news_article_candidates
WHERE review_status IN ('pending', 'needs_review')
  AND publish_status IN ('draft', 'ready')
ORDER BY published_source_at DESC, created_at DESC;

REVOKE ALL ON public.news_review_queue_v1 FROM PUBLIC, anon, authenticated;

COMMIT;
