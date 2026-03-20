ALTER TABLE public.alert_subscriptions
  ALTER COLUMN channel SET DEFAULT 'email';

UPDATE public.alert_subscriptions
SET
  channel = 'email',
  delivery_status = CASE
    WHEN last_booking IS NULL THEN 'needs_booking_date'
    WHEN delivery_status IN ('pending', 'queued', 'needs_booking_date', 'failed', 'sent') THEN delivery_status
    ELSE 'pending'
  END
WHERE plan_code = 'free';
