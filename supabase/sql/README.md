# Supabase SQL Helpers

Run these in Supabase Dashboard -> SQL Editor.

- `2026-03-17_vendor-verification.sql`: adds optional vendor verification fields used by the Commercial UI.
- `2026-03-18_live-contract-alignment.sql`: mirrors the live `subscriptions` and `commercial_leads` contract into repo-managed SQL.
- `2026-03-29_repo-contract-alignment.sql`: adds the repo-managed `vendors`, `feedback`, and `price_corrections` contracts so checked-in SQL stays aligned with production usage.
- `2026-03-29_scrape-config-foundation.sql`: adds repo-managed city, source, topic, and runtime config tables for the 3E scraper/news backend upgrade.
- `2026-03-29_city-registry-seo-access.sql`: exposes only SEO-enabled city registry rows to the frontend and adds a news retention runtime key.
- `2026-03-26_track-security-advisor-fix.sql`: enables RLS and explicit public read policies on the Track read-model tables, and flips `pin_track_summary_v1` to `security_invoker`.
- `2026-03-26_security-warning-hardening.sql`: pins mutable public function search paths and replaces permissive public insert policies with explicit checks.
- `vendor_insert_template.sql`: template for inserting a new vendor listing row.

Supporting docs:
- `../BACKEND_INVENTORY.md`: backend inventory of current canonical tables, views, RPCs, edge functions, and legacy/transitional contracts.
