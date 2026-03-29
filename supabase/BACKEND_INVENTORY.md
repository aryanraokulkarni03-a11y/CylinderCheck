# CylinderCheck Backend Inventory

This document is the repo-side source of truth for which Supabase tables,
views, RPCs, and Edge Functions currently power the app.

It is intentionally practical:
- which surfaces depend on which contracts
- which objects are canonical
- which objects are legacy or transitional
- what must stay aligned before Phase 3E grows

## Canonical read models

### Track and household planning
- `public.pin_track_summary_v1`
  - Canonical public read model for Track and city SEO household surfaces.
  - Used by:
    - `src/App.jsx`
    - `src/features/seo/CitySEOPage.jsx`
- `public.lpg_prices`
  - Canonical city price table for domestic and commercial rates.
  - Used by:
    - `src/App.jsx`
    - `src/features/seo/CitySEOPage.jsx`
    - `src/features/commercial/CommercialPage.jsx`
    - `src/features/commercial/CommercialCitySEOPage.jsx`

### News
- `public.news_articles`
  - Current normalized news cache/feed table.
  - Used by:
    - `supabase/functions/lpg-news/index.ts`
    - `supabase/functions/scrape-news/index.ts`
    - `src/features/news/NewsTab.jsx` through the `lpg-news` edge function
  - Important:
    - This is not yet a full article publishing system.
    - Phase 3E should treat this as legacy feed storage or a migration source.

### Commercial
- `public.vendors`
  - Canonical vendor directory for business/commercial surfaces.
  - Used by:
    - `src/features/commercial/CommercialPage.jsx`
    - `src/features/commercial/CommercialCitySEOPage.jsx`
  - Current UI-relevant fields:
    - `id`
    - `name`
    - `category`
    - `city`
    - `tagline`
    - `description`
    - `whatsapp`
    - `phone`
    - `website`
    - `active`
    - `featured`
    - `listing_expires_at`
    - `verification_status`
    - `license_number`
    - `verified_at`
    - `verification_notes`
    - `created_at`

## Intake and workflow tables

### Community / alerts / payments
- `public.reports`
- `public.report_votes`
- `public.alert_subscriptions`
- `public.subscriptions`
- `public.commercial_leads`
- `public.auth_notification_log`

### Support and QA intake
- `public.feedback`
  - Repo-managed support and product feedback intake table.
  - Not yet wired to a live form in the frontend.
- `public.price_corrections`
  - Repo-managed price correction intake table.
  - Not yet wired to a live form in the frontend.

## Track snapshot internals

These are canonical internal tables behind `pin_track_summary_v1`:
- `public.pin_profiles`
- `public.pin_user_signals`
- `public.pin_contributor_profiles`
- `public.pin_neighbor_edges`
- `public.pin_delivery_confidence`
- `public.pin_supply_pressure`
- `public.distributors`
- `public.pin_distributor_coverage`

Transitional / supporting:
- `public.pin_data`
  - Still present for historical and fallback support.
  - Not the preferred long-term planning model.

## RPCs and functions the app depends on

### RPCs
- `public.get_avg_delivery_days(p_pin)`
  - Used in `src/App.jsx`
- `public.refresh_track_confidence_snapshots()`
  - Used by `supabase/functions/scrape-prices/index.ts`

### Edge Functions
- `notify-sign-in`
  - Triggered from `src/App.jsx`
- `scrape-prices`
  - Writes price + scrape observability tables
- `scrape-news`
  - Writes normalized news feed rows
- `lpg-news`
  - Public feed reader for `/news`
- `dispatch-alerts`
  - Sends email reminders
- `verify-payment`
  - Writes paid subscriptions
- `get-admin-stats`
  - Admin summary endpoint

## Observability tables

- `public.scrape_runs`
- `public.scrape_request_log`
- `public.lpg_price_scrape_log`

These are the current observability base for the scraping layer.

## Config foundation tables

- `public.city_registry`
  - Canonical repo-managed city list for scraper scope, SEO surfaces, and news location support.
  - Seeds the current household SEO, commercial SEO, price scrape, and news city footprint.
  - Public frontend reads should be limited to SEO-enabled rows only.
- `public.scrape_source_registry`
  - Canonical source list for price and news ingestion.
  - Holds source host/base URL, retry defaults, and fetch-mode metadata.
- `public.scrape_topic_registry`
  - Canonical news topic query list.
  - Replaces the hardcoded LPG news query set over time.
- `public.scrape_runtime_config`
  - Canonical runtime knob store for scraper defaults.
  - Holds values like news limit, fetch timeout, jitter, and retry defaults.

## Known backend maturity notes

### Config-driven workflow status
- `scrape-prices` now reads its enabled cities, primary source, and runtime defaults from:
  - `city_registry`
  - `scrape_source_registry`
  - `scrape_runtime_config`
- The shared news helpers now read their source, topic list, city aliases, and runtime knobs from:
  - `city_registry`
  - `scrape_source_registry`
  - `scrape_topic_registry`
  - `scrape_runtime_config`
- Remaining hardcoded behavior is now mostly limited to parsing heuristics and product-specific validation logic, not source/city/workflow ownership.

### Current schema gaps now closed in repo
The repo now explicitly represents:
- `vendors`
- `feedback`
- `price_corrections`

### Phase 3E implication
Phase 3E should build on:
- repo/live contract alignment first
- config-driven scraper workflow second
- article-grade publishing tables after that

## Canonical vs legacy guidance

Prefer these for new work:
- `pin_track_summary_v1`
- `lpg_prices`
- `vendors`
- `news_articles` only as the current feed layer
- `scrape_runs` + `scrape_request_log` for scraper observability

Avoid expanding new frontend dependencies directly on:
- `pin_data` unless only for fallback compatibility
- raw snapshot internals unless the read model truly cannot express the need
