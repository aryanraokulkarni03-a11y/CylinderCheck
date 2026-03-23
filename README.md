# CylinderCheck

CylinderCheck is a web intelligence platform for LPG booking-window tracking, community-driven shortage signals, and market reference data. Built primarily for domestic and commercial LPG consumers in India, the application currently operates with a Bangalore-first growth posture, bringing clarity to opaque supply chains.

## Features Today
- **Track:** PIN-level planning, trust-scored local evidence, and community signal insight.
- **Reports:** Signed-in shortage submissions with persistent, signed-in community upvoting.
- **News:** Mapped LPG intelligence feed tracking supply constraints and logistics updates.
- **Alerts:** Free email-first booking reminder flow powered by a scheduled dispatch job (Plus tier is currently kept dark as a preview layer).
- **Commercial:** Verified 19kg supplier browsing alongside tracked commercial market references.

## Recent implementation status
The repository reflects several recently shipped milestones:
- Route metadata registry and Bangalore-targeted SEO landing pages.
- Track trust ladder and canonical PIN profiles.
- Community signals integrated directly into the Track surface.
- Persistent report upvotes for logged-in users.
- Strongly branded reports surfaces across both mobile and desktop.
- Plus tier reframed cleanly as a preview-only experience.

## Repository structure
- `src/` — App shell, feature modules, shared UI components, and SEO metadata.
- `public/` — Brand assets, fonts, robots.txt, and generated sitemap output.
- `scripts/` — Build-time utilities like automated sitemap generation.
- `supabase/sql/` — Database schema definitions and rollout migrations.
- `supabase/functions/` — Edge functions executing price scraping, news aggregation, alerts dispatch, and admin stats.
- `.github/workflows/` — Scheduled operational jobs driving the platform.
- `docs/` — Design and product specification context.
- Root files — Includes `supabase_schema.sql`, `index.html`, `package.json`, and `vercel.json`.

## Current Ops

The live operational model relies on standard Node and GitHub Actions flows:
- **Builds:** Running `npm run build` executes the prebuild script to generate the sitemap, then runs the Vite build.
- **Alerts Dispatch:** Driven by `.github/workflows/dispatch-alerts.yml` running hourly. Alert delivery is currently email-first through the existing Supabase dispatch function.
- **Price Scraping:** Driven by `.github/workflows/scrape-prices.yml` running twice daily (06:00 and 18:00 IST).
- **Scrape Sandbox:** `.github/workflows/scrape-prices-sandbox.yml` provides a manual dry-run lane for concurrency, jitter, retry, and proxy experiments without publishing live prices.
- **Dead-man monitoring:** Both scheduled workflows can emit start / success / fail pings to Healthchecks.io so GitHub cron inactivity does not fail silently.
- **Commercial Verification:** Supplier listings are manually verified and inserted through the existing vendor flow.

**Workflow secrets:**
- `dispatch-alerts.yml`
  - `SUPABASE_FUNCTIONS_BASE_URL`
  - `SUPABASE_ANON_KEY`
  - `HC_DISPATCH_ALERTS_START_URL`
  - `HC_DISPATCH_ALERTS_SUCCESS_URL`
  - `HC_DISPATCH_ALERTS_FAIL_URL`
- `scrape-prices.yml`
  - `SUPABASE_FUNCTIONS_BASE_URL`
  - `SUPABASE_CRON_SECRET`
  - `HC_SCRAPE_PRICES_START_URL`
  - `HC_SCRAPE_PRICES_SUCCESS_URL`
  - `HC_SCRAPE_PRICES_FAIL_URL`
- `scrape-prices-sandbox.yml`
  - `SUPABASE_SANDBOX_FUNCTIONS_BASE_URL`
  - `SUPABASE_SANDBOX_CRON_SECRET`

**Healthchecks.io setup:**
- Create one check for `scrape-prices` and one check for `dispatch-alerts`
- Set the expected schedule to match each workflow
- Use a dead-man window of 25 hours for the twice-daily `scrape-prices` workflow
- Use the corresponding start / success / fail URLs from each check as the GitHub secrets above
- Heartbeat pings are non-blocking: monitor downtime will not stop the underlying job from running

**Scraper environment role:**
- Production function should set `SCRAPE_ENV=production`
- Sandbox function should set `SCRAPE_ENV=sandbox`
- Sandbox mode is dry-run only and will refuse live publishing

## Setup

1. Install dependencies: `npm install`
2. Environment configuration: copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID` (required for Plus preview layer)
   - `VITE_ADMIN_PASSWORD` (optional; unlocks admin access via the logo easter egg)
3. Run locally: `npm run dev`

## Disclaimer

CylinderCheck is not affiliated with Indane (IndianOil), HP Gas, or Bharatgas. Data is community-sourced and may be incomplete. Always verify availability and rates with your local agency.
