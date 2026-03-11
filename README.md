# 🔥 CylinderCheck — Setup Guide

Complete step-by-step to go from zero → live in ~30 minutes.

---

## Prerequisites (you already have these)
- Node.js installed
- Git installed
- VS Code ready
- A free account on: [supabase.com](https://supabase.com) + [vercel.com](https://vercel.com) + [github.com](https://github.com)

---

## STEP 1 — Create the project locally

```bash
# In VS Code terminal (Ctrl+`)
cd Desktop                    # or wherever you keep projects
git clone <this-repo>         # or just copy the files into a new folder
cd cylindercheck
npm install
```

You should see `node_modules/` appear. That's good.

---

## STEP 2 — Set up Supabase (your database)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `cylindercheck`, pick any password, pick region **Mumbai (ap-south-1)**
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Paste the entire contents of `supabase_schema.sql` → click **Run**
   - You'll see the tables created + seed data loaded ✅

6. Go to **Settings → API** (left sidebar)
7. Copy two values:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public key** (long string under "Project API keys")

---

## STEP 3 — Create your environment file

```bash
# In the project root, create .env.local
cp .env.example .env.local
```

Open `.env.local` in VS Code and fill in:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
```

---

## STEP 4 — Run it locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

✅ Try entering PIN `400001` or `530001` — you should see live data from your Supabase DB.
✅ Submit a report in the Community tab — check Supabase Table Editor to see it appear.

---

## STEP 5 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial CylinderCheck commit"
```

On GitHub:
1. Go to [github.com/new](https://github.com/new)
2. Name it `cylindercheck`, make it **Private** for now
3. Copy the remote URL they give you

```bash
git remote add origin https://github.com/YOUR-USERNAME/cylindercheck.git
git branch -M main
git push -u origin main
```

---

## STEP 6 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your `cylindercheck` GitHub repo
3. Framework preset will auto-detect as **Vite** ✅
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy**

🎉 In ~60 seconds you get a live URL like `cylindercheck.vercel.app`

---

## STEP 7 — Connect a custom domain (optional but recommended for SEO)

1. Buy `cylindercheck.in` at GoDaddy / Namecheap (~₹700/year)
2. In Vercel → **Domains** → Add your domain
3. Update DNS records as Vercel instructs (takes ~10 min to propagate)

---

## Monetization activation

### AdSense
1. Apply at [adsense.google.com](https://adsense.google.com) with your live URL
2. Add the AdSense script tag to `index.html` once approved
3. Place `<ins>` ad units in the Prices and Alerts tabs

### ₹29/month Premium Alerts
1. Create a [Razorpay](https://razorpay.com) account (free, 2% fee)
2. Create a Subscription Plan for ₹29/month
3. Wire the "Upgrade to Plus →" button to Razorpay checkout
4. On successful payment, update `alert_type = 'plus'` in Supabase

### Twilio for actual SMS alerts
1. Sign up at [twilio.com](https://twilio.com) — free trial gives ₹1,500 credit
2. Use a Supabase Edge Function (cron) to check `alert_subscriptions` daily
3. SMS users 2 days before their 25-day window opens

---

## Project structure

```
cylindercheck/
├── index.html              ← Entry point + SEO meta tags
├── vite.config.js          ← Vite config
├── package.json            ← Dependencies
├── supabase_schema.sql     ← Run this in Supabase SQL Editor
├── .env.example            ← Copy to .env.local and fill in
├── .gitignore
└── src/
    ├── main.jsx            ← React root
    ├── App.jsx             ← Full app (all 4 tabs, Supabase wired)
    └── supabaseClient.js   ← DB connection singleton
```

---

## SEO quick wins

Add these to `index.html` `<head>` before launch:
- Title: `LPG Cylinder Booking Date Calculator India | CylinderCheck`
- Description: `Check your gas cylinder booking window, track delivery by PIN code, report shortages. Free tool for IndianOil, HP Gas & Bharat Gas customers.`
- Submit to Google Search Console after deploy

---

## Questions?

Every step above is achievable in one sitting. Estimated time:
- Steps 1–4 (local dev): 10 minutes
- Steps 5–6 (deploy): 10 minutes  
- Step 7 (domain): 5 minutes
- Monetization: Whenever you're ready
