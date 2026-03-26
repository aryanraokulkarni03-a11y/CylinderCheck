# Supabase SQL Helpers

Run these in Supabase Dashboard -> SQL Editor.

- `2026-03-17_vendor-verification.sql`: adds optional vendor verification fields used by the Commercial UI.
- `2026-03-18_live-contract-alignment.sql`: mirrors the live `subscriptions` and `commercial_leads` contract into repo-managed SQL.
- `2026-03-26_track-security-advisor-fix.sql`: enables RLS and explicit public read policies on the Track read-model tables, and flips `pin_track_summary_v1` to `security_invoker`.
- `vendor_insert_template.sql`: template for inserting a new vendor listing row.
