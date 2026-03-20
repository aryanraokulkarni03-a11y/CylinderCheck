-- Alert delivery fields for free WhatsApp reminders

ALTER TABLE public.alert_subscriptions
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'booking_d_minus_2';

UPDATE public.alert_subscriptions
SET
  channel = COALESCE(channel, 'whatsapp'),
  plan_code = COALESCE(plan_code, CASE WHEN alert_type = 'free' THEN 'free' ELSE 'plus' END),
  delivery_status = COALESCE(delivery_status, 'pending'),
  reminder_type = COALESCE(reminder_type, 'booking_d_minus_2');

CREATE INDEX IF NOT EXISTS alert_subscriptions_plan_code_idx
  ON public.alert_subscriptions (plan_code);

CREATE INDEX IF NOT EXISTS alert_subscriptions_delivery_status_idx
  ON public.alert_subscriptions (delivery_status);

CREATE INDEX IF NOT EXISTS alert_subscriptions_next_send_at_idx
  ON public.alert_subscriptions (next_send_at);

-- Subscription lifecycle fields for a dark-launched Plus plan

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'plus_monthly',
  ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

UPDATE public.subscriptions
SET
  plan_code = COALESCE(plan_code, 'plus_monthly'),
  delivery_enabled = COALESCE(delivery_enabled, false);

CREATE INDEX IF NOT EXISTS subscriptions_plan_code_idx
  ON public.subscriptions (plan_code);

CREATE INDEX IF NOT EXISTS subscriptions_delivery_enabled_idx
  ON public.subscriptions (delivery_enabled);
