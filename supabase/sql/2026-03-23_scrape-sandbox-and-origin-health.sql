-- ============================================
-- CylinderCheck - Scrape sandbox + origin health
-- Adds run-level and request-level observability for scraper
-- sandbox experiments without publishing live price data.
-- ============================================

CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id                 BIGSERIAL PRIMARY KEY,
  scraper_name       TEXT NOT NULL,
  scrape_mode        TEXT NOT NULL DEFAULT 'production',
  source_host        TEXT NOT NULL,
  publish_enabled    BOOLEAN NOT NULL DEFAULT true,
  target_count       INT NOT NULL DEFAULT 0,
  max_concurrency    INT NOT NULL DEFAULT 1,
  request_jitter_ms  INT NOT NULL DEFAULT 0,
  retry_limit        INT NOT NULL DEFAULT 0,
  proxy_label        TEXT,
  status             TEXT NOT NULL DEFAULT 'running',
  config_snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary            JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_runs_mode_check
    CHECK (scrape_mode IN ('production', 'sandbox')),
  CONSTRAINT scrape_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed')),
  CONSTRAINT scrape_runs_target_count_check
    CHECK (target_count >= 0),
  CONSTRAINT scrape_runs_concurrency_check
    CHECK (max_concurrency >= 1),
  CONSTRAINT scrape_runs_jitter_check
    CHECK (request_jitter_ms >= 0),
  CONSTRAINT scrape_runs_retry_check
    CHECK (retry_limit >= 0)
);

CREATE INDEX IF NOT EXISTS scrape_runs_scraper_mode_idx
  ON public.scrape_runs (scraper_name, scrape_mode, started_at DESC);

CREATE INDEX IF NOT EXISTS scrape_runs_status_idx
  ON public.scrape_runs (status, started_at DESC);

CREATE OR REPLACE FUNCTION public.touch_scrape_run_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scrape_runs_set_updated_at
  ON public.scrape_runs;

CREATE TRIGGER scrape_runs_set_updated_at
  BEFORE UPDATE ON public.scrape_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_scrape_run_updated_at();

ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scrape_request_log (
  id                 BIGSERIAL PRIMARY KEY,
  run_id             BIGINT REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  scraper_name       TEXT NOT NULL,
  scrape_mode        TEXT NOT NULL DEFAULT 'production',
  source_host        TEXT NOT NULL,
  target_key         TEXT NOT NULL,
  target_url         TEXT NOT NULL,
  request_url        TEXT NOT NULL,
  proxy_label        TEXT,
  attempt            INT NOT NULL DEFAULT 1,
  status_code        INT,
  request_status     TEXT NOT NULL,
  latency_ms         INT,
  error_message      TEXT,
  rate_limited       BOOLEAN NOT NULL DEFAULT false,
  blocked_suspected  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scrape_request_log_mode_check
    CHECK (scrape_mode IN ('production', 'sandbox')),
  CONSTRAINT scrape_request_log_attempt_check
    CHECK (attempt >= 1),
  CONSTRAINT scrape_request_log_status_check
    CHECK (request_status IN ('success', 'timeout', 'rate_limited', 'blocked', 'http_error', 'network_error')),
  CONSTRAINT scrape_request_log_latency_check
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS scrape_request_log_run_idx
  ON public.scrape_request_log (run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_request_log_source_status_idx
  ON public.scrape_request_log (source_host, request_status, created_at DESC);

CREATE INDEX IF NOT EXISTS scrape_request_log_rate_limit_idx
  ON public.scrape_request_log (rate_limited, blocked_suspected, created_at DESC);

ALTER TABLE public.scrape_request_log ENABLE ROW LEVEL SECURITY;
