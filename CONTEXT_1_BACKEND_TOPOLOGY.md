# CylinderCheck — Backend Topology
## For Antigravity: Read this before touching anything.
## This is the engine. You are building the surface on top of it.

---

## ABSOLUTE RULE

Do NOT modify any file listed in the "DO NOT TOUCH" section below.
Your job is the visual layer only. The engine underneath is complete,
tested, and live in production.

---

## Stack

```
Frontend:   React 18 + Vite 5
Backend:    Supabase (PostgreSQL + Edge Functions + Auth + RLS)
Payments:   Razorpay (via Supabase Edge Function — never client-side secret)
Deploy:     Vercel
Analytics:  @vercel/analytics (already injected in main.jsx)
```

---

## Environment Variables

All prefixed with `VITE_` — available in browser via `import.meta.env`

```
VITE_SUPABASE_URL          — Supabase project URL
VITE_SUPABASE_ANON_KEY     — Supabase anon/public key (safe to expose)
VITE_RAZORPAY_KEY_ID       — Razorpay publishable key (safe to expose)
VITE_ADMIN_PASSWORD        — Admin dashboard gate (5x logo click Easter egg)
```

Supabase Edge Function secrets (server-side only, never in .env.local):
```
RAZORPAY_KEY_SECRET        — Razorpay secret (Supabase secrets vault)
ADMIN_PASSWORD             — Same value as VITE_ADMIN_PASSWORD
CRON_SECRET                — Auth token for scrape-prices cron job
```

---

## Supabase Client

File: `src/supabaseClient.js` — DO NOT MODIFY

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
)
export const hasSupabase = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Import in your components exactly like this:
```js
import { supabase } from '../supabaseClient'
```

---

## Database Tables

### pin_data
Stores delivery intelligence per PIN code.
```sql
pin         TEXT UNIQUE    -- 6-digit Indian postal code
city        TEXT           -- "Hyderabad, Telangana"
state       TEXT
agency      TEXT           -- "IndianOil" | "HP Gas" | "Bharat Gas"
avg_days    NUMERIC(4,1)   -- average delivery days for this PIN
shortage    BOOLEAN
trend       TEXT           -- "stable" | "improving" | "worsening"
updated_at  TIMESTAMPTZ
```

### reports
Community-sourced shortage reports.
```sql
id              BIGSERIAL PRIMARY KEY
pin             TEXT
city            TEXT
issue           TEXT            -- free text report content
votes           INT DEFAULT 0
delivery_days   INT             -- optional: how long delivery actually took
user_id         TEXT            -- Supabase auth UID
user_email      TEXT
company         TEXT            -- "IndianOil" | "HP Gas" | "Bharat Gas"
created_at      TIMESTAMPTZ
```
RLS: public read + insert. Edit/delete only by owner (user_id match).

### alert_subscriptions
Email/phone alert signups.
```sql
contact         TEXT    -- email or Indian mobile number
pin             TEXT
last_booking    DATE
alert_type      TEXT    -- "free" | "plus" | "price_revision"
active          BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ
```
RLS: public insert only. Reads blocked for anon.

### lpg_prices
LPG cylinder prices by city and company.
```sql
company         TEXT           -- "IndianOil" | "HP Gas" | "Bharat Gas"
price           NUMERIC(7,2)   -- price in INR
city            TEXT           -- matches CITY_COORDS keys
recorded_at     TIMESTAMPTZ
```
Updated weekly by scrape-prices Edge Function.

### subscriptions
Razorpay Plus subscription records.
```sql
contact                TEXT
pin                    TEXT
razorpay_order_id      TEXT
razorpay_payment_id    TEXT
razorpay_signature     TEXT
status                 TEXT    -- "active" | "cancelled"
amount                 INT     -- in paise (4900 = ₹49)
created_at             TIMESTAMPTZ
```
RLS: service role only.

### vendors (NEW — commercial MVP)
Paid supplier listings for the commercial page.
```sql
id                  BIGSERIAL PRIMARY KEY
name                TEXT
category            TEXT    -- "induction" | "electric" | "kerosene" | "png" | "other"
city                TEXT    -- must match COMMERCIAL_CITIES array
tagline             TEXT    -- one-line pitch
description         TEXT
whatsapp            TEXT    -- with country code e.g. "919000000001"
phone               TEXT
website             TEXT
active              BOOLEAN DEFAULT true
featured            BOOLEAN DEFAULT false
listing_expires_at  TIMESTAMPTZ
created_at          TIMESTAMPTZ
```
RLS: public can read active + non-expired. Service role writes.

### commercial_leads (NEW — commercial MVP)
Restaurant/hotel owners requesting alternatives.
```sql
id              BIGSERIAL PRIMARY KEY
business_name   TEXT
business_type   TEXT  -- "restaurant"|"hotel"|"dhaba"|"bakery"|"catering"|"cloud_kitchen"|"other"
city            TEXT
pin             TEXT
phone           TEXT
need_type       TEXT  -- "induction"|"electric"|"kerosene"|"png"|"not_sure"
cylinders_week  INT
message         TEXT
contacted       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
```
RLS: public insert only. Service role reads (leads contain phone numbers).

### price_corrections
User-submitted price corrections (via Support modal).
```sql
city            TEXT
company         TEXT
reported_price  TEXT
correct_price   TEXT
contact         TEXT
created_at      TIMESTAMPTZ
```

### feedback
General product feedback.
```sql
message         TEXT
contact         TEXT
created_at      TIMESTAMPTZ
```

---

## Edge Functions

All deployed to Supabase. Call via:
```js
const SUPABASE_FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// Example call
const res = await fetch(`${SUPABASE_FUNC_URL}/lpg-news`, {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
})
```

### lpg-news
- Method: GET
- Auth: Bearer anon key
- Returns: `{ ok: boolean, articles: Array<{ title, link, pubDate, source }> }`
- Purpose: Fetches LPG news from Google News RSS

### scrape-prices
- Method: POST
- Auth: Bearer CRON_SECRET
- Purpose: Weekly cron job. Scrapes lpg prices from goodreturns.in
- Do NOT call from client

### create-order
- Method: POST
- Auth: Bearer anon key
- Body: `{ contact: string, pin: string }`
- Returns: `{ order_id: string, amount: number, currency: string }`
- Purpose: Creates Razorpay order for Plus subscription

### verify-payment
- Method: POST
- Auth: Bearer anon key
- Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, contact, pin }`
- Returns: `{ success: boolean, payment_id?: string, error?: string }`
- Purpose: Verifies HMAC signature and stores subscription

### get-admin-stats
- Method: POST
- Auth: Bearer anon key
- Body: `{ admin_password: string }`
- Returns: `{ ok, subscriptions, reportCount, alertCount }`
- Purpose: Admin dashboard data

---

## Auth

Google OAuth via Supabase Auth.
```js
// Sign in
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
})

// Sign out
supabase.auth.signOut()

// Get session
supabase.auth.getSession()

// Listen for changes
supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null)
})
```

Auth is required for:
- Submitting reports (spam prevention)
- Edit/delete own reports

Auth is NOT required for:
- Viewing anything
- Voting on reports
- Alert signups
- Payment (uses contact field instead)

---

## External APIs

### Postal PIN lookup
```js
const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
const j = await r.json()
// Returns: { PostOffice: [{ District, State, Name }] }
```

### Razorpay (client-side)
```js
// Load script dynamically — only when payment is triggered
const s = document.createElement('script')
s.src = 'https://checkout.razorpay.com/v1/checkout.js'
document.body.appendChild(s)
```

### Leaflet.js (map)
```js
// Load from CDN dynamically — only when Prices/News tab is active
// CSS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
// JS:  https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// Map tiles: CartoCDN (dark + light variants based on theme)
```

---

## DO NOT TOUCH — PRESERVED LOGIC

The following functions must be carried over exactly into the new
component structure. Do not rewrite, simplify, or "improve" them.
They are tested and production-ready.

```
handleTrack()         — PIN lookup + Promise.all parallel fetches
handleReport()        — Community report submission
handleEditReport()    — Edit own report
handleDeleteReport()  — Delete own report (with confirm guard)
handleVote()          — Upvote with local dedup via votes state object
handlePayment()       — Full Razorpay flow: load → create-order → open → verify
handleLogoClick()     — Easter egg: 5 clicks → admin prompt
handleAdminUnlock()   — Password check → fetch admin stats
fetchNews()           — News fetch with 5-minute stale check via ref
lookupPIN()           — Postal API lookup
loadRazorpay()        — Dynamic script injection
```

All state management for these handlers must be preserved.
Move them into appropriate feature components but keep logic identical.

---

## Theme System

File: `src/theme.js` — DO NOT MODIFY

```js
// Module-level Map cache for localStorage reads
getTheme()     // returns 'dark' | 'light'
setTheme(v)    // sets data-theme on <html> + localStorage
toggleTheme()  // flips between dark/light
```

Apply theme on mount in main.jsx:
```js
import { getTheme, setTheme } from './theme.js'
setTheme(getTheme())
```

Dark mode is controlled via `data-theme` attribute on `<html>`.
Tailwind dark mode config must use `selector` strategy:
```js
// tailwind.config.js
darkMode: ['selector', '[data-theme="dark"]']
```

---

## City Data

```js
// These 12 cities have coordinates for the Leaflet map
const CITY_COORDS = {
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Mumbai:    { lat: 19.0760, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Vizag:     { lat: 17.6868, lng: 83.2185 },
  Jaipur:    { lat: 26.9124, lng: 75.7873 },
  Lucknow:   { lat: 26.8467, lng: 80.9462 },
  Patna:     { lat: 25.5941, lng: 85.1376 },
}

// These 7 cities are the commercial crisis cities
const COMMERCIAL_CITIES = [
  'Mumbai', 'Bangalore', 'Hyderabad',
  'Chennai', 'Delhi', 'Kolkata', 'Vizag'
]

// City normalisation — postal API names → our keys
const CITY_NORMALISE = {
  'visakhapatnam': 'Vizag', 'bengaluru': 'Bangalore',
  'new delhi': 'Delhi', 'calcutta': 'Kolkata',
  'madras': 'Chennai', 'bombay': 'Mumbai',
}

// Companies
const COMPANIES = ['IndianOil', 'HP Gas', 'Bharat Gas']
const COMPANY_EMOJI = {
  IndianOil: '🔵', 'HP Gas': '🟡', 'Bharat Gas': '🟢'
}
```

---

## Tab Structure

The app has 6 tabs:
```
track       — Booking Tracker (PIN lookup, urgency score, shortage status)
prices      — LPG Prices (Leaflet map, city prices, price revision alert)
community   — Community Reports (submit, vote, edit, delete)
news        — LPG News (RSS feed, categorised, WhatsApp share)
alerts      — Alerts & Plus (free alert, Plus subscription, Razorpay)
commercial  — For Businesses (commercial crisis page, vendor listings, leads)
```

Tab state lives at App level.
The `commercial` tab is the newest — added in the commercial MVP.

---

## AdSense

Publisher ID: `ca-pub-6163036693948238`
Three ad slots exist in the current layout (rectangle, leaderboard, responsive).
Preserve these in the new layout in the same logical positions.
```js
useEffect(() => {
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
}, [id])
```

---

## Production URLs

Live site:    https://www.cylindercheck.in
Supabase:     https://[project-id].supabase.co
Edge fns:     https://[project-id].supabase.co/functions/v1/[fn-name]
