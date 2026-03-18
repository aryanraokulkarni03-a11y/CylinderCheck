-- First-sign-in notification log
-- Tracks one-time auth welcome emails so we do not resend on session restores.

CREATE TABLE IF NOT EXISTS auth_notification_log (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL,
  email             TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  provider          TEXT NOT NULL DEFAULT 'resend',
  status            TEXT NOT NULL DEFAULT 'pending',
  last_error        TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS auth_notification_log_email_idx
  ON auth_notification_log (email);

CREATE INDEX IF NOT EXISTS auth_notification_log_status_idx
  ON auth_notification_log (status);
