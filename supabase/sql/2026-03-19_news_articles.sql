-- Normalized news storage for scheduled LPG intelligence scraping.

CREATE TABLE IF NOT EXISTS public.news_articles (
  id           BIGSERIAL PRIMARY KEY,
  article_key  TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  source       TEXT NOT NULL,
  link         TEXT NOT NULL,
  google_link  TEXT NOT NULL,
  source_url   TEXT,
  category     TEXT NOT NULL,
  city         TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_articles_published_at_idx
  ON public.news_articles (published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_scraped_at_idx
  ON public.news_articles (scraped_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_city_idx
  ON public.news_articles (city);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read news articles" ON public.news_articles;
CREATE POLICY "Anyone can read news articles"
  ON public.news_articles
  FOR SELECT
  USING (true);
