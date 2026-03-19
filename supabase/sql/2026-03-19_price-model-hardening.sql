-- Shift LPG prices to a city-level product model and preserve scrape auditability.

ALTER TABLE public.lpg_prices
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS product_type TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE public.lpg_prices
  ALTER COLUMN company DROP NOT NULL;

UPDATE public.lpg_prices
SET
  state = COALESCE(state, CASE city
    WHEN 'Delhi' THEN 'Delhi'
    WHEN 'Mumbai' THEN 'Maharashtra'
    WHEN 'Bangalore' THEN 'Karnataka'
    WHEN 'Hyderabad' THEN 'Telangana'
    WHEN 'Chennai' THEN 'Tamil Nadu'
    WHEN 'Pune' THEN 'Maharashtra'
    WHEN 'Kolkata' THEN 'West Bengal'
    WHEN 'Ahmedabad' THEN 'Gujarat'
    WHEN 'Vizag' THEN 'Andhra Pradesh'
    WHEN 'Jaipur' THEN 'Rajasthan'
    WHEN 'Lucknow' THEN 'Uttar Pradesh'
    WHEN 'Patna' THEN 'Bihar'
    ELSE NULL
  END),
  product_type = COALESCE(product_type, 'domestic_14_2kg')
WHERE state IS NULL OR product_type IS NULL;

WITH ranked_prices AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY city, product_type
      ORDER BY recorded_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM public.lpg_prices
)
DELETE FROM public.lpg_prices
WHERE id IN (
  SELECT id
  FROM ranked_prices
  WHERE row_num > 1
);

DROP INDEX IF EXISTS public.lpg_prices_company_city_key;
ALTER TABLE public.lpg_prices
  DROP CONSTRAINT IF EXISTS lpg_prices_company_city_key;
CREATE UNIQUE INDEX IF NOT EXISTS lpg_prices_city_product_type_key
  ON public.lpg_prices (city, product_type);

CREATE TABLE IF NOT EXISTS public.lpg_price_scrape_log (
  id                BIGSERIAL PRIMARY KEY,
  city              TEXT NOT NULL,
  state             TEXT,
  product_type      TEXT NOT NULL,
  source_url        TEXT NOT NULL,
  candidate_price   NUMERIC(7,2),
  published_price   NUMERIC(7,2),
  parse_method      TEXT,
  validation_status TEXT NOT NULL,
  validation_reason TEXT,
  scraped_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lpg_price_scrape_log
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS product_type TEXT;

UPDATE public.lpg_price_scrape_log
SET
  state = COALESCE(state, CASE city
    WHEN 'Delhi' THEN 'Delhi'
    WHEN 'Mumbai' THEN 'Maharashtra'
    WHEN 'Bangalore' THEN 'Karnataka'
    WHEN 'Hyderabad' THEN 'Telangana'
    WHEN 'Chennai' THEN 'Tamil Nadu'
    WHEN 'Pune' THEN 'Maharashtra'
    WHEN 'Kolkata' THEN 'West Bengal'
    WHEN 'Ahmedabad' THEN 'Gujarat'
    WHEN 'Vizag' THEN 'Andhra Pradesh'
    WHEN 'Jaipur' THEN 'Rajasthan'
    WHEN 'Lucknow' THEN 'Uttar Pradesh'
    WHEN 'Patna' THEN 'Bihar'
    ELSE NULL
  END),
  product_type = COALESCE(product_type, 'domestic_14_2kg')
WHERE state IS NULL OR product_type IS NULL;

ALTER TABLE public.lpg_price_scrape_log
  ALTER COLUMN product_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS lpg_price_scrape_log_scraped_at_idx
  ON public.lpg_price_scrape_log (scraped_at DESC);

CREATE INDEX IF NOT EXISTS lpg_price_scrape_log_status_idx
  ON public.lpg_price_scrape_log (validation_status);

ALTER TABLE public.lpg_price_scrape_log ENABLE ROW LEVEL SECURITY;
