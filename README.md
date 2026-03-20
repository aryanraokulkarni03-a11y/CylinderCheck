# CylinderCheck

CylinderCheck is a web app for LPG booking-window tracking and community shortage intelligence in India.

## What It Does
- Track: booking window + delivery ETA + shortage signal by PIN
- Reports: community shortage reports (sign-in required to submit)
- News: LPG intelligence feed with city map filtering
- Alerts: free email booking reminder, with Plus kept dark until delivery is proven
- Commercial: private supplier listings (state-based) + tracked commercial LPG pricing

## Tech
- React + Vite + Tailwind (token-driven UI)
- Supabase (Postgres + RLS) + Edge Functions
- Leaflet (maps)
- Razorpay (Plus payments)

## Setup
1. Install: `npm install`
2. Env: copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID` (required for Plus)
   - `VITE_ADMIN_PASSWORD` (optional; unlocks admin via the logo Easter egg)
3. Run: `npm run dev`

## Scheduled jobs
- GitHub Actions drives recurring jobs for this repo.
- Add these repository secrets before enabling schedules:
  - `SUPABASE_FUNCTIONS_BASE_URL`
  - `SUPABASE_ANON_KEY`
- Workflows:
  - `.github/workflows/dispatch-alerts.yml` runs hourly
  - `.github/workflows/scrape-prices.yml` runs twice daily at 06:00 and 18:00 IST

## Notes
- Canonical UI/UX spec: `docs/CONTEXT_0-4_*.md` + `docs/BRIEF_IMPLEMENTATION.md`
- Commercial vendor verification helper: `supabase/sql/2026-03-17_vendor-verification.sql`

## Disclaimer
CylinderCheck is not affiliated with Indane (IndianOil), HP Gas, or Bharatgas. Data is community-sourced and may be incomplete. Always verify availability and rates with your local agency.
