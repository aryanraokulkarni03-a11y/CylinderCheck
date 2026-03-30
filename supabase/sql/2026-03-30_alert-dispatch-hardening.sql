ALTER TABLE public.alert_subscriptions
  DROP CONSTRAINT IF EXISTS alert_subscriptions_delivery_status_check;

ALTER TABLE public.alert_subscriptions
  ADD CONSTRAINT alert_subscriptions_delivery_status_check
  CHECK (delivery_status IN ('pending', 'needs_booking_date', 'scheduled', 'sent', 'failed'));

CREATE TABLE IF NOT EXISTS public.alert_dispatch_jobs (
  id                        BIGSERIAL PRIMARY KEY,
  job_key                   TEXT NOT NULL,
  trigger_mode              TEXT NOT NULL DEFAULT 'scheduled',
  delivery_channel          TEXT NOT NULL DEFAULT 'email',
  provider                  TEXT,
  reminder_type             TEXT,
  status                    TEXT NOT NULL DEFAULT 'running',
  scanned_count             INT NOT NULL DEFAULT 0,
  sent_count                INT NOT NULL DEFAULT 0,
  failed_count              INT NOT NULL DEFAULT 0,
  skipped_count             INT NOT NULL DEFAULT 0,
  retry_scheduled_count     INT NOT NULL DEFAULT 0,
  invalid_contact_count     INT NOT NULL DEFAULT 0,
  provider_rejected_count   INT NOT NULL DEFAULT 0,
  transient_failure_count   INT NOT NULL DEFAULT 0,
  payload_json              JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error                TEXT,
  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alert_dispatch_jobs_trigger_mode_check
    CHECK (trigger_mode IN ('manual', 'scheduled', 'fallback')),
  CONSTRAINT alert_dispatch_jobs_channel_check
    CHECK (delivery_channel IN ('email', 'sms', 'whatsapp')),
  CONSTRAINT alert_dispatch_jobs_status_check
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'cancelled')),
  CONSTRAINT alert_dispatch_jobs_count_check
    CHECK (
      scanned_count >= 0
      AND sent_count >= 0
      AND failed_count >= 0
      AND skipped_count >= 0
      AND retry_scheduled_count >= 0
      AND invalid_contact_count >= 0
      AND provider_rejected_count >= 0
      AND transient_failure_count >= 0
    )
);

CREATE INDEX IF NOT EXISTS alert_dispatch_jobs_status_idx
  ON public.alert_dispatch_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS alert_dispatch_jobs_reminder_idx
  ON public.alert_dispatch_jobs (reminder_type, delivery_channel, created_at DESC);

CREATE INDEX IF NOT EXISTS alert_dispatch_jobs_provider_idx
  ON public.alert_dispatch_jobs (provider, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_alert_dispatch_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alert_dispatch_jobs_set_updated_at
  ON public.alert_dispatch_jobs;

CREATE TRIGGER alert_dispatch_jobs_set_updated_at
  BEFORE UPDATE ON public.alert_dispatch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_alert_dispatch_job_updated_at();

ALTER TABLE public.alert_dispatch_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.alert_dispatch_attempts (
  id                  BIGSERIAL PRIMARY KEY,
  job_id              BIGINT NOT NULL REFERENCES public.alert_dispatch_jobs(id) ON DELETE CASCADE,
  attempt_number      INT NOT NULL DEFAULT 1,
  subscription_id     BIGINT REFERENCES public.alert_subscriptions(id) ON DELETE SET NULL,
  contact             TEXT,
  delivery_channel    TEXT NOT NULL DEFAULT 'email',
  reminder_type       TEXT,
  provider            TEXT,
  idempotency_key     TEXT,
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'running',
  failure_class       TEXT,
  http_status         INT,
  latency_ms          INT,
  error_message       TEXT,
  scheduled_for       TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alert_dispatch_attempts_attempt_check
    CHECK (attempt_number >= 1),
  CONSTRAINT alert_dispatch_attempts_channel_check
    CHECK (delivery_channel IN ('email', 'sms', 'whatsapp')),
  CONSTRAINT alert_dispatch_attempts_status_check
    CHECK (status IN ('running', 'sent', 'failed', 'skipped')),
  CONSTRAINT alert_dispatch_attempts_failure_class_check
    CHECK (
      failure_class IS NULL
      OR failure_class IN ('invalid_contact', 'provider_rejected', 'transient_provider_error', 'network_error', 'config_error', 'unknown')
    ),
  CONSTRAINT alert_dispatch_attempts_latency_check
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS alert_dispatch_attempts_job_idx
  ON public.alert_dispatch_attempts (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS alert_dispatch_attempts_subscription_idx
  ON public.alert_dispatch_attempts (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS alert_dispatch_attempts_status_idx
  ON public.alert_dispatch_attempts (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS alert_dispatch_attempts_job_subscription_attempt_idx
  ON public.alert_dispatch_attempts (job_id, subscription_id, attempt_number);

CREATE OR REPLACE FUNCTION public.touch_alert_dispatch_attempt_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alert_dispatch_attempts_set_updated_at
  ON public.alert_dispatch_attempts;

CREATE TRIGGER alert_dispatch_attempts_set_updated_at
  BEFORE UPDATE ON public.alert_dispatch_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_alert_dispatch_attempt_updated_at();

ALTER TABLE public.alert_dispatch_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.alert_dispatch_health_v1
WITH (security_invoker = true) AS
SELECT
  delivery_channel,
  reminder_type,
  provider,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded_runs,
  COUNT(*) FILTER (WHERE status = 'partial') AS partial_runs,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_runs,
  MAX(created_at) AS latest_run_at,
  MAX(completed_at) AS latest_completed_at,
  COALESCE(SUM(sent_count), 0) AS sent_count_total,
  COALESCE(SUM(failed_count), 0) AS failed_count_total,
  COALESCE(SUM(skipped_count), 0) AS skipped_count_total
FROM public.alert_dispatch_jobs
GROUP BY delivery_channel, reminder_type, provider;

REVOKE ALL ON TABLE public.alert_dispatch_jobs FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.alert_dispatch_attempts FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.alert_dispatch_health_v1 FROM public, anon, authenticated;
