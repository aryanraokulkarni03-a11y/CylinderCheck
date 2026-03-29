-- ============================================
-- CylinderCheck - Scrape job governance
-- Date: 2026-03-29
-- Purpose:
--   1. Add canonical scrape job + attempt tables.
--   2. Add raw source document staging for parser debugging.
--   3. Add lightweight health views for source/job observability.
-- ============================================

BEGIN;

INSERT INTO public.scrape_runtime_config (
  config_key,
  config_scope,
  enabled,
  value_json,
  description
) VALUES
  (
    'raw_document_retention_days',
    'global',
    true,
    '7'::jsonb,
    'Default number of days raw scrape payloads should be retained before cleanup.'
  )
ON CONFLICT (config_key) DO UPDATE SET
  config_scope = EXCLUDED.config_scope,
  enabled = EXCLUDED.enabled,
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.scrape_jobs (
  id            BIGSERIAL PRIMARY KEY,
  job_type      TEXT NOT NULL,
  job_key       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  source_key    TEXT,
  target_key    TEXT,
  trigger_mode  TEXT NOT NULL DEFAULT 'manual',
  payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error    TEXT,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_jobs_type_check
    CHECK (job_type IN ('price_scrape', 'news_scrape')),
  CONSTRAINT scrape_jobs_status_check
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'cancelled')),
  CONSTRAINT scrape_jobs_trigger_mode_check
    CHECK (trigger_mode IN ('manual', 'scheduled', 'fallback'))
);

CREATE INDEX IF NOT EXISTS scrape_jobs_type_status_idx
  ON public.scrape_jobs (job_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_jobs_source_target_idx
  ON public.scrape_jobs (source_key, target_key, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_jobs_job_key_idx
  ON public.scrape_jobs (job_type, job_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_scrape_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scrape_jobs_set_updated_at
  ON public.scrape_jobs;

CREATE TRIGGER scrape_jobs_set_updated_at
  BEFORE UPDATE ON public.scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_scrape_job_updated_at();

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scrape_job_attempts (
  id                 BIGSERIAL PRIMARY KEY,
  job_id             BIGINT NOT NULL REFERENCES public.scrape_jobs(id) ON DELETE CASCADE,
  attempt_number     INT NOT NULL DEFAULT 1,
  target_key         TEXT,
  status             TEXT NOT NULL DEFAULT 'running',
  request_url        TEXT,
  source_url         TEXT,
  source_host        TEXT,
  http_status        INT,
  latency_ms         INT,
  error_message      TEXT,
  blocked_suspected  BOOLEAN NOT NULL DEFAULT false,
  rate_limited       BOOLEAN NOT NULL DEFAULT false,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_job_attempts_attempt_check
    CHECK (attempt_number >= 1),
  CONSTRAINT scrape_job_attempts_status_check
    CHECK (status IN ('running', 'succeeded', 'failed', 'timeout', 'rate_limited', 'blocked', 'partial')),
  CONSTRAINT scrape_job_attempts_latency_check
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS scrape_job_attempts_job_idx
  ON public.scrape_job_attempts (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_job_attempts_status_idx
  ON public.scrape_job_attempts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_job_attempts_source_idx
  ON public.scrape_job_attempts (source_host, target_key, created_at DESC);

ALTER TABLE public.scrape_job_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.raw_source_documents (
  id               BIGSERIAL PRIMARY KEY,
  job_id           BIGINT NOT NULL REFERENCES public.scrape_jobs(id) ON DELETE CASCADE,
  attempt_id       BIGINT REFERENCES public.scrape_job_attempts(id) ON DELETE SET NULL,
  source_key       TEXT NOT NULL,
  target_key       TEXT,
  document_kind    TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  content_text     TEXT NOT NULL,
  content_hash     TEXT NOT NULL,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_until  TIMESTAMPTZ NOT NULL,
  metadata_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT raw_source_documents_kind_check
    CHECK (document_kind IN ('html', 'rss', 'json'))
);

CREATE INDEX IF NOT EXISTS raw_source_documents_job_idx
  ON public.raw_source_documents (job_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS raw_source_documents_retention_idx
  ON public.raw_source_documents (retention_until, fetched_at DESC);

CREATE INDEX IF NOT EXISTS raw_source_documents_source_idx
  ON public.raw_source_documents (source_key, target_key, fetched_at DESC);

ALTER TABLE public.raw_source_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.scrape_job_health_v1
WITH (security_invoker = true) AS
SELECT
  job_type,
  source_key,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded_jobs,
  COUNT(*) FILTER (WHERE status = 'partial') AS partial_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_jobs,
  MAX(created_at) AS last_job_created_at,
  MAX(finished_at) AS last_job_finished_at,
  MAX(finished_at) FILTER (WHERE status = 'succeeded') AS last_success_at
FROM public.scrape_jobs
GROUP BY job_type, source_key;

CREATE OR REPLACE VIEW public.scrape_source_health_v1
WITH (security_invoker = true) AS
SELECT
  j.job_type,
  j.source_key,
  a.source_host,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE a.status = 'succeeded') AS succeeded_attempts,
  COUNT(*) FILTER (WHERE a.status IN ('failed', 'timeout', 'rate_limited', 'blocked')) AS failed_attempts,
  COUNT(*) FILTER (WHERE a.rate_limited) AS rate_limited_attempts,
  COUNT(*) FILTER (WHERE a.blocked_suspected) AS blocked_attempts,
  MAX(a.finished_at) AS last_attempt_finished_at,
  MAX(a.finished_at) FILTER (WHERE a.status = 'succeeded') AS last_success_at
FROM public.scrape_job_attempts a
JOIN public.scrape_jobs j
  ON j.id = a.job_id
GROUP BY j.job_type, j.source_key, a.source_host;

REVOKE ALL ON TABLE public.scrape_job_health_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.scrape_source_health_v1 FROM PUBLIC, anon, authenticated;

COMMIT;
