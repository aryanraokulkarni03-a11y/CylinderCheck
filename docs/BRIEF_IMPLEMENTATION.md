# CylinderCheck — Antigravity Implementation Brief
## The Build Instructions. Read after all 5 CONTEXT files.
## Design Language: DEEPLIGHT — Hope arriving in darkness.
## Version: 1.0 | March 2026

---

## BEFORE YOU WRITE A SINGLE LINE

Confirm you have absorbed all 5 context files:
- CONTEXT_0: The product, Deeplight, the boundary
- CONTEXT_1: Backend topology, preserved handlers, DB schema
- CONTEXT_2: Design system, tokens, Kalamkari, glass tiers
- CONTEXT_3: Motion system, named springs, component implementations
- CONTEXT_4: The 5 Laws, anti-patterns, accessibility, performance

If any of those are unclear — re-read before continuing.

The emotional north star: **hope of finding legitimate cylinders.**
Every decision passes through that filter.

---

## INSTALL SEQUENCE

Run these in order. Do not skip any step.

```bash
# 1. Install new dependencies
npm install motion
npm install geist
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-accordion
npm install class-variance-authority clsx tailwind-merge

# 2. Install Tailwind v4
npm install tailwindcss@next @tailwindcss/vite@next

# 3. Install shadcn CLI
npm install -D @shadcn/ui

# 4. Initialise shadcn
npx shadcn init
# When prompted:
# Style: Default
# Base color: Neutral
# CSS variables: Yes
```

Update `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          motion:   ['motion'],
        },
      },
    },
    target: 'es2020',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'motion'],
  },
})
```

Create `vercel.json` at project root:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*).js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*).css",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

---

## BUILD ORDER — Follow This Exactly

```
Phase 1 — Foundation        (Tasks 1–5)
Phase 2 — Shared Components (Tasks 6–12)
Phase 3 — Layout Shell      (Tasks 13–16)
Phase 4 — Feature Tabs      (Tasks 17–26)
Phase 5 — Commercial Page   (Tasks 27–30)
Phase 6 — Polish & QA       (Tasks 31–35)
```

Do not start Phase 2 before Phase 1 is complete.
Do not start a new task before the previous one is working.

---

## PHASE 1 — FOUNDATION

### Task 1 — Design Tokens

Create `src/lib/tokens.css`

This file replaces the entire old `index.css` token system.
Every colour, spacing, radius, timing value lives here.
No colour is ever hardcoded anywhere else in the project.

```css
/* src/lib/tokens.css */

/* ─── Deeplight Dark Mode (default) ─────────────────────── */
:root {
  /* Surfaces */
  --bg-base:      #0F0D14;
  --bg-raised:    #181520;
  --bg-inset:     #0A0810;
  --bg-glass:     rgba(24, 21, 32, 0.72);

  /* Glass tiers */
  --glass-deep:   rgba(24, 21, 32, 0.88);
  --glass-mid:    rgba(24, 21, 32, 0.65);
  --glass-whisper:rgba(224, 120, 48, 0.06);
  --fog-border:   rgba(255, 220, 160, 0.08);
  --fog-highlight:rgba(255, 220, 160, 0.04);

  /* Text */
  --text-primary:   #F4EFE8;
  --text-secondary: #A89880;
  --text-muted:     #6B5E50;
  --text-data:      #E8D4A8;
  --text-on-accent: #FFFFFF;

  /* Accent */
  --accent:         #E07830;
  --accent-hover:   #CC6A22;
  --accent-soft:    rgba(224, 120, 48, 0.10);
  --accent-glow:    rgba(224, 120, 48, 0.20);
  --accent-fog:     rgba(224, 120, 48, 0.06);
  --accent-pop:     #FF8C42;

  /* Kalamkari palette */
  --k-indigo:     #2D2449;
  --k-terracotta: #8B3A2A;
  --k-turmeric:   #C4882A;
  --k-forest:     #2A5C3A;
  --k-cream:      #F0E6D0;

  /* Status */
  --status-clear:       #6DB88A;
  --status-clear-glow:  rgba(45, 92, 58, 0.25);
  --status-early:       #E8A840;
  --status-early-glow:  rgba(196, 136, 42, 0.25);
  --status-active:      #C45A38;
  --status-active-glow: rgba(139, 58, 42, 0.30);
  --status-severe:      #B83030;
  --status-severe-glow: rgba(107, 26, 26, 0.35);

  /* Structure */
  --border:       rgba(240, 230, 208, 0.08);
  --divider:      rgba(240, 230, 208, 0.05);
  --shadow-dark:  #07060A;
  --shadow-glow:  rgba(224, 120, 48, 0.08);

  /* Typography */
  --font-display: 'Bricolage Grotesque', sans-serif;
  --font-body:    'Instrument Sans', sans-serif;
  --font-data:    'Geist Mono', 'Fira Code', monospace;

  /* Spacing */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-10: 40px; --space-12: 48px;
  --space-16: 64px; --space-20: 80px;

  /* Radius */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   18px;
  --radius-xl:   24px;
  --radius-pill: 9999px;

  /* Timing */
  --dur-instant: 80ms;
  --dur-fast:    150ms;
  --dur-base:    220ms;
  --dur-slow:    400ms;
  --ease-out:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.2, 0.64, 1);

  /* Layout */
  --sidebar-width:   240px;
  --topbar-height:   56px;
  --bottomnav-height:64px;
  --content-max:     1080px;
}

/* ─── Light Mode ─────────────────────────────────────────── */
[data-theme="light"] {
  --bg-base:      #F5EFE4;
  --bg-raised:    #FDFAF5;
  --bg-inset:     #EDE4D6;
  --bg-glass:     rgba(253, 250, 245, 0.78);
  --glass-deep:   rgba(245, 239, 228, 0.92);
  --glass-mid:    rgba(253, 250, 245, 0.75);
  --glass-whisper:rgba(196, 100, 26, 0.06);
  --fog-border:   rgba(200, 160, 80, 0.15);
  --fog-highlight:rgba(200, 160, 80, 0.08);
  --text-primary:   #1C1610;
  --text-secondary: #6B5040;
  --text-muted:     #9A8070;
  --text-data:      #5C3C18;
  --accent:         #C4641A;
  --accent-hover:   #B05518;
  --accent-soft:    rgba(196, 100, 26, 0.10);
  --accent-glow:    rgba(196, 100, 26, 0.18);
  --border:         rgba(180, 140, 80, 0.15);
  --divider:        rgba(180, 140, 80, 0.08);
  --shadow-glow:    rgba(196, 100, 26, 0.06);
}

/* ─── Global Reset ───────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-primary);
  background-color: var(--bg-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: contain;
}

/* ─── Kalamkari Background Texture ──────────────────────── */
/* Opacity 4% dark, 5% light. Invisible at first glance.    */
/* Adds warmth subconsciously before the eye finds it.      */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M20 60 C20 40 40 20 60 20 C80 20 100 40 100 60 C100 80 80 100 60 100 C40 100 20 80 20 60Z' fill='none' stroke='%23E8D4A8' stroke-width='0.5' opacity='0.4'/%3E%3Cpath d='M60 10 C60 10 50 30 60 50 C70 30 60 10 60 10Z' fill='%23E8D4A8' opacity='0.3'/%3E%3Ccircle cx='60' cy='60' r='3' fill='%23E8D4A8' opacity='0.3'/%3E%3Cpath d='M10 60 C30 50 50 55 60 60 C50 65 30 70 10 60Z' fill='%23E8D4A8' opacity='0.25'/%3E%3Cpath d='M110 60 C90 50 70 55 60 60 C70 65 90 70 110 60Z' fill='%23E8D4A8' opacity='0.25'/%3E%3C/svg%3E");
  background-size: 120px 120px;
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
}

[data-theme="light"] body::before {
  opacity: 0.05;
}

/* ─── Scrollbar ──────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }

/* ─── Focus ──────────────────────────────────────────────── */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* ─── Interactive ────────────────────────────────────────── */
button, a, input, select, textarea, [role="button"] {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

button { cursor: pointer; font-family: var(--font-body); border: none; background: none; }
button:disabled { cursor: not-allowed; opacity: 0.45; }
a { text-decoration: none; color: inherit; }
input, textarea, select { font-family: var(--font-body); }
img, svg { display: block; max-width: 100%; }
```

---

### Task 2 — Motion Library

Create `src/lib/springs.js` and `src/lib/animations.js`

Copy the complete implementations from CONTEXT_3_MOTION_SYSTEM.md.
Every spring config. Every animation variant. Exactly as written.

---

### Task 3 — Utility Functions

Create `src/lib/utils.js`

```js
// src/lib/utils.js
// Utility functions — preserved from original App.jsx

export const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export const fmt = (d) =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

export const daysUntil = (d) => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.ceil((d - t) / 86400000)
}

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

export const lookupPIN = async (pin) => {
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    const j = await r.json()
    if (j[0]?.Status === 'Success' && j[0]?.PostOffice?.length > 0) {
      const po = j[0].PostOffice[0]
      return { city: po.District, state: po.State, area: po.Name }
    }
  } catch { /* ignore */ }
  return null
}

export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

// City data constants
export const CITY_COORDS = {
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

export const COMMERCIAL_CITIES = [
  'Mumbai', 'Bangalore', 'Hyderabad',
  'Chennai', 'Delhi', 'Kolkata', 'Vizag'
]

export const CITY_NORMALISE = {
  'visakhapatnam': 'Vizag', 'vizag': 'Vizag',
  'bengaluru': 'Bangalore', 'bangalore': 'Bangalore',
  'new delhi': 'Delhi', 'delhi': 'Delhi',
  'calcutta': 'Kolkata', 'kolkata': 'Kolkata',
  'madras': 'Chennai', 'chennai': 'Chennai',
  'bombay': 'Mumbai', 'mumbai': 'Mumbai',
}

export const COMPANIES = ['IndianOil', 'HP Gas', 'Bharat Gas']
export const COMPANY_EMOJI = {
  IndianOil: '🔵', 'HP Gas': '🟡', 'Bharat Gas': '🟢'
}
```

---

### Task 4 — Tailwind Config

Create `tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body:    ['Instrument Sans', 'sans-serif'],
        data:    ['Geist Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-data': 'var(--text-data)',
        'bg-base': 'var(--bg-base)',
        'bg-raised': 'var(--bg-raised)',
        'bg-inset': 'var(--bg-inset)',
        border: 'var(--border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        '1': 'var(--space-1)', '2': 'var(--space-2)',
        '3': 'var(--space-3)', '4': 'var(--space-4)',
        '5': 'var(--space-5)', '6': 'var(--space-6)',
        '8': 'var(--space-8)', '10': 'var(--space-10)',
        '12': 'var(--space-12)',
      },
    },
  },
  plugins: [],
}
```

---

### Task 5 — Update main.jsx

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import { GeistMono } from 'geist/font/mono'
import './lib/tokens.css'
import { getTheme, setTheme } from './theme.js'

inject()
setTheme(getTheme())

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{
        background: 'var(--bg-base, #0F0D14)',
        color: 'var(--status-severe, #B83030)',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-data)',
        padding: 24,
      }}>
        <div style={{ fontSize: 28, marginBottom: 16 }}>❌ App Error</div>
        <div style={{
          background: 'var(--bg-raised, #181520)',
          padding: 20, borderRadius: 12,
          maxWidth: 480, width: '100%',
          color: 'var(--text-secondary)',
          fontSize: 13, lineHeight: 1.8,
        }}>
          <strong style={{ color: 'var(--status-severe)' }}>
            {this.state.error.message}
          </strong>
          <br /><br />
          Check .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        </div>
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

**CHECKPOINT 1:** All foundation files created. Run `npm run dev`.
The app should load with the warm dark background and Kalamkari texture visible.
If it doesn't — fix before continuing.

---

## PHASE 2 — SHARED COMPONENTS

### Task 6 — ThemeToggle

```jsx
// src/components/shared/ThemeToggle.jsx
import { useState } from 'react'
import { motion } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme } from '../../theme.js'
import { springs } from '../../lib/springs'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark')

  return (
    <motion.button
      onClick={() => { toggleTheme(); setIsDark(p => !p) }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={springs.response}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-9 h-9 rounded-pill
                 bg-[var(--bg-inset)] border border-[var(--border)]
                 text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                 transition-colors duration-150 flex-shrink-0"
    >
      {isDark
        ? <Sun size={15} strokeWidth={1.8} />
        : <Moon size={15} strokeWidth={1.8} />
      }
    </motion.button>
  )
}
```

---

### Task 7 — LiquidGlassBtn

Copy the complete implementation from CONTEXT_3_MOTION_SYSTEM.md Task 1.
This is the signature element. Build it exactly as specified.

Additional CSS in tokens.css:
```css
.glass-btn {
  backdrop-filter: blur(12px) saturate(160%);
  background: var(--glass-whisper);
  border: 1px solid rgba(224, 120, 48, 0.22);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-pop);
  min-height: 52px;
  padding: 0 28px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.glass-btn:hover {
  border-color: rgba(224, 120, 48, 0.38);
}

@media (max-width: 768px) {
  .glass-btn { min-height: 56px; font-size: 16px; }
}
```

---

### Task 8 — StatusDot

Copy the complete implementation from CONTEXT_3_MOTION_SYSTEM.md Task 2.

---

### Task 9 — SectionMarker

```jsx
// src/components/shared/SectionMarker.jsx
import { StatusDot } from './StatusDot'

export function SectionMarker({ status = 'clear', label, sublabel }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <StatusDot status={status} size={7} />
      <div className="flex items-center gap-2">
        <span className="font-data text-[11px] font-semibold
                         uppercase tracking-[0.14em]
                         text-[var(--text-muted)]">
          LIVE
        </span>
        {label && (
          <>
            <span className="text-[var(--divider)] font-data text-[11px]">·</span>
            <span className="font-data text-[11px] font-semibold
                             uppercase tracking-[0.14em]
                             text-[var(--text-muted)]">
              {label}
            </span>
          </>
        )}
        {sublabel && (
          <>
            <span className="text-[var(--divider)] font-data text-[11px]">·</span>
            <span className="font-data text-[11px]
                             tracking-[0.08em]
                             text-[var(--text-muted)] opacity-60">
              {sublabel}
            </span>
          </>
        )}
      </div>
      {/* Horizontal rule extending right */}
      <div className="flex-1 h-px bg-[var(--divider)]" />
    </div>
  )
}
```

---

### Task 10 — KalamkariDivider

```jsx
// src/components/shared/KalamkariDivider.jsx
// Replaces all standard <hr> elements

export function KalamkariDivider({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 my-5 ${className}`}>
      {/* Small vine motif — left end */}
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path
          d="M1 5 C1 3 3 1 5 1 C7 1 8 3 8 5 C8 7 7 9 5 9 C3 9 1 7 1 5Z"
          stroke="var(--border)" strokeWidth="0.8" fill="none"
        />
        <path
          d="M8 5 L15 5"
          stroke="var(--divider)" strokeWidth="0.8"
        />
      </svg>
      {/* Line */}
      <div className="flex-1 h-px bg-[var(--divider)]" />
    </div>
  )
}
```

---

### Task 11 — Ring (Booking Window)

```jsx
// src/components/shared/Ring.jsx
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { useEffect, useRef } from 'react'
import { springs } from '../../lib/springs'

export function Ring({ daysLeft }) {
  const r = 48
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, (25 - Math.max(daysLeft, 0)) / 25))
  const color = daysLeft <= 0
    ? 'var(--status-clear)'
    : daysLeft <= 3
      ? 'var(--status-active)'
      : 'var(--accent)'

  const progress = useMotionValue(0)
  const strokeDashoffset = useTransform(
    progress, [0, 1],
    [circumference, circumference * (1 - pct)]
  )
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    animate(progress, 1, { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] })
  }, [progress])

  return (
    <svg width="116" height="116" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r}
        fill="none" stroke="var(--border)" strokeWidth="6" />
      <motion.circle cx="55" cy="55" r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset }}
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="50" textAnchor="middle"
        fill={color} fontSize="24" fontWeight="700"
        fontFamily="var(--font-data)">
        {daysLeft <= 0 ? '✓' : daysLeft}
      </text>
      <text x="55" y="66" textAnchor="middle"
        fill="var(--text-muted)" fontSize="9"
        letterSpacing="1.2" fontFamily="var(--font-data)">
        {daysLeft <= 0 ? 'BOOK NOW' : 'DAYS LEFT'}
      </text>
    </svg>
  )
}
```

---

### Task 12 — AdSlot

```jsx
// src/components/shared/AdSlot.jsx
import { useEffect } from 'react'

const AD_CLIENT = 'ca-pub-6163036693948238'

export function AdSlot({ id = 'default', type = 'rectangle' }) {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) }
    catch { /* not loaded */ }
  }, [id])

  if (type === 'rectangle') return (
    <div className="flex justify-center my-4">
      <ins className="adsbygoogle"
        style={{ display: 'inline-block', width: '300px', height: '250px' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_1" />
    </div>
  )

  if (type === 'leaderboard') return (
    <div className="flex justify-center my-4 overflow-x-hidden">
      <ins className="adsbygoogle"
        style={{ display: 'inline-block', width: '728px', height: '90px', maxWidth: '100%' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_2"
        data-ad-format="horizontal" />
    </div>
  )

  return (
    <div className="my-4">
      <ins className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="REPLACE_SLOT_3"
        data-ad-format="auto"
        data-full-width-responsive="true" />
    </div>
  )
}
```

**CHECKPOINT 2:** All shared components built.
Test ThemeToggle toggles correctly.
Test StatusDot shows pulse animation for all 4 states.
Test SectionMarker renders correctly in both themes.
Fix before continuing.

---

## PHASE 3 — LAYOUT SHELL

### Task 13 — Flame Icon (Deeplight Version)

```jsx
// src/components/shared/FlameIcon.jsx
// Redesigned with Kalamkari peacock feather curve informing the flame shape

export function FlameIcon({ size = 28 }) {
  return (
    <svg width={size} height={size * 1.3}
      viewBox="0 0 28 36" fill="none" className="flex-shrink-0">
      {/* Outer flame — Kalamkari-informed organic curve */}
      <path
        d="M14 2C14 2 22 10 22 18C22 24 18.5 27 14 27
           C9.5 27 6 24 6 18C6 10 14 2 14 2Z"
        fill="var(--accent)"
        opacity="0.9"
      />
      {/* Inner flame — brighter core */}
      <path
        d="M14 10C14 10 18 15 18 19C18 22 16.5 23.5 14 23.5
           C11.5 23.5 10 22 10 19C10 15 14 10 14 10Z"
        fill="var(--accent-pop)"
      />
      {/* Cylinder body */}
      <rect x="9" y="27" width="10" height="6" rx="1"
        fill="var(--text-muted)" opacity="0.6" />
      {/* Cylinder base */}
      <ellipse cx="14" cy="33" rx="7" ry="2"
        fill="var(--border)" />
    </svg>
  )
}
```

---

### Task 14 — Sidebar (Desktop)

```jsx
// src/components/layout/Sidebar.jsx
import { motion } from 'motion/react'
import { FlameIcon } from '../shared/FlameIcon'
import { ThemeToggle } from '../shared/ThemeToggle'
import { SectionMarker } from '../shared/SectionMarker'
import { supabase } from '../../supabaseClient'
import { HelpCircle } from 'lucide-react'

// Tab icons imported from the tab config

export function Sidebar({ tabs, activeTab, onTabChange,
                           user, authLoading, logoClicks,
                           onLogoClick, onSupportOpen }) {
  return (
    <aside className="fixed top-0 left-0 bottom-0 z-[200]
                      flex flex-col
                      bg-[var(--bg-raised)]
                      border-r border-[var(--border)]"
           style={{ width: 'var(--sidebar-width)' }}>

      {/* Logo */}
      <div
        onClick={onLogoClick}
        title={logoClicks > 0 ? `${5 - logoClicks} more…` : ''}
        className="flex items-center gap-3 px-5 py-5
                   border-b border-[var(--border)] cursor-default select-none"
      >
        <FlameIcon size={26} />
        <span className="font-display font-extrabold text-[20px]
                         tracking-[-0.02em] text-[var(--text-primary)]
                         flex items-baseline gap-[2px]">
          CylinderCheck
          <span className="w-[7px] h-[7px] rounded-full
                           bg-[var(--accent)] inline-block
                           flex-shrink-0 ml-[2px]" />
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 flex flex-col gap-1 flex-1 overflow-y-auto">
        <span className="text-[10px] font-bold tracking-[0.18em]
                         uppercase text-[var(--text-muted)]
                         px-3 mb-2 block">
          Main
        </span>
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md
                        text-[14px] font-medium w-full text-left
                        transition-colors duration-150
                        ${activeTab === tab.id
                          ? 'bg-[var(--bg-inset)] text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
                        }`}
          >
            <tab.icon
              size={18}
              strokeWidth={1.8}
              style={{ color: activeTab === tab.id
                ? 'var(--accent)' : 'currentColor' }}
            />
            {tab.label}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[var(--border)]
                      flex flex-col gap-3">
        <button
          onClick={onSupportOpen}
          className="flex items-center gap-2 text-[12px]
                     text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                     transition-colors duration-150 w-full text-left"
        >
          <HelpCircle size={13} />
          Support & FAQ
        </button>

        {/* Auth */}
        {!authLoading && (
          user ? (
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded-full flex-shrink-0
                              bg-[var(--accent-soft)] border border-[var(--accent)]
                              flex items-center justify-center
                              text-[11px] font-bold text-[var(--accent)]">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]
                               flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-[11px] text-[var(--text-muted)]
                           hover:text-[var(--status-active)]
                           transition-colors duration-150"
              >
                Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
              })}
              className="text-[12px] text-[var(--text-muted)]
                         hover:text-[var(--accent)] transition-colors
                         duration-150 text-left"
            >
              Sign in with Google
            </button>
          )
        )}

        <p className="text-[10px] text-[var(--text-muted)]
                      leading-[1.6] mt-1">
          Not affiliated with IndianOil,<br />
          HP Gas, or Bharat Gas.<br />
          Data is community-sourced.<br /><br />
          © 2026 CylinderCheck 🇮🇳
        </p>
      </div>
    </aside>
  )
}
```

---

### Task 15 — Topbar (Mobile Only)

```jsx
// src/components/layout/Topbar.jsx
import { FlameIcon } from '../shared/FlameIcon'
import { ThemeToggle } from '../shared/ThemeToggle'
import { supabase } from '../../supabaseClient'

export function Topbar({ user, authLoading }) {
  return (
    <header
      className="md:hidden flex items-center gap-3
                 border-b border-[var(--border)]
                 sticky top-0 z-[100] px-4"
      style={{
        height: 'var(--topbar-height)',
        paddingTop: 'env(safe-area-inset-top)',
        backdropFilter: 'blur(28px) saturate(130%)',
        WebkitBackdropFilter: 'blur(28px) saturate(130%)',
        background: 'var(--glass-deep)',
      }}
    >
      <FlameIcon size={22} />
      <span className="font-display font-extrabold text-[18px]
                       tracking-[-0.02em] text-[var(--text-primary)] flex-1">
        CylinderCheck
      </span>

      {!authLoading && !user && (
        <button
          onClick={() => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
          })}
          className="text-[12px] text-[var(--text-muted)]
                     hover:text-[var(--accent)] transition-colors px-2 py-1"
        >
          Sign in
        </button>
      )}

      {!authLoading && user && (
        <div className="w-7 h-7 rounded-full flex-shrink-0
                        bg-[var(--accent-soft)] border border-[var(--accent)]
                        flex items-center justify-center
                        text-[12px] font-bold text-[var(--accent)]">
          {user.email?.[0]?.toUpperCase() || 'U'}
        </div>
      )}

      <ThemeToggle />
    </header>
  )
}
```

---

### Task 16 — BottomNav (Mobile Only)

```jsx
// src/components/layout/BottomNav.jsx
import { motion } from 'motion/react'
import { springs } from '../../lib/springs'

export function BottomNav({ tabs, activeTab, onTabChange }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[200]
                 flex border-t border-[var(--border)]"
      style={{
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        paddingTop: '6px',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        background: 'var(--glass-deep)',
      }}
    >
      {tabs.map(tab => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.08 }}
          className={`flex-1 flex flex-col items-center gap-[3px]
                      px-[2px] py-[5px] relative min-h-[50px]
                      text-[10px] font-bold tracking-[0.04em] uppercase
                      transition-colors duration-150
                      ${activeTab === tab.id
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-secondary)]'
                      }`}
        >
          {/* Top indicator pip */}
          {activeTab === tab.id && (
            <motion.span
              layoutId="nav-pip"
              className="absolute top-0 w-7 h-[3px] rounded-b-sm
                         bg-[var(--accent)]"
              transition={springs.smooth}
            />
          )}

          <tab.icon
            size={18}
            strokeWidth={1.8}
            style={{
              filter: activeTab === tab.id
                ? 'drop-shadow(0 0 6px var(--accent-glow))'
                : 'none'
            }}
          />
          {tab.label}
        </motion.button>
      ))}
    </nav>
  )
}
```

**CHECKPOINT 3:** Layout shell complete.
Desktop: sidebar visible, content takes remaining width.
Mobile: topbar sticky, bottom nav fixed, content clears both.
Theme toggle works in both sidebar and topbar.
Test on 390px viewport.
Fix before continuing.

---

## PHASE 4 — FEATURE TABS

### Task 17 — App.jsx (Routing Shell)

The new App.jsx is a routing shell only.
All state management lives here. All handlers live here.
Tab content is delegated to feature components.

```jsx
// src/App.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from './supabaseClient'
import { getTheme, toggleTheme } from './theme.js'
import { springs } from './lib/springs'
import { lookupPIN, loadRazorpay, CITY_COORDS, COMPANIES } from './lib/utils'

// Layout
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { BottomNav } from './components/layout/BottomNav'

// Modals
import { SupportModal } from './components/modals/SupportModal'

// Feature tabs
import { TrackTab } from './features/track/TrackTab'
import { PricesTab } from './features/prices/PricesTab'
import { ReportsTab } from './features/reports/ReportsTab'
import { NewsTab } from './features/news/NewsTab'
import { AlertsTab } from './features/alerts/AlertsTab'
import { CommercialPage } from './features/commercial/CommercialPage'
import { AdminTab } from './features/admin/AdminTab'

// Tab icons
import {
  Target, DollarSign, MessageSquare,
  Newspaper, Bell, Store
} from 'lucide-react'

const TABS = [
  { id: 'track',      label: 'Track',    icon: Target },
  { id: 'prices',     label: 'Prices',   icon: DollarSign },
  { id: 'community',  label: 'Reports',  icon: MessageSquare },
  { id: 'news',       label: 'News',     icon: Newspaper },
  { id: 'alerts',     label: 'Alerts',   icon: Bell },
  { id: 'commercial', label: 'For Biz',  icon: Store },
]

const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const RAZORPAY_KEY_ID   = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
const ADMIN_PASSWORD    = import.meta.env.VITE_ADMIN_PASSWORD || ''

export default function App() {
  // ── Tab state ────────────────────────────────────────────
  const [tab, setTab] = useState('track')

  // ── Track tab ────────────────────────────────────────────
  const [pin, setPin] = useState('')
  const [lastBooking, setLastBooking] = useState('')
  const [pinData, setPinData] = useState(null)
  const [bookingResult, setBookingResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const resultRef = useRef(null)

  // ── Reports ──────────────────────────────────────────────
  const [reports, setReports] = useState([])
  const [reportText, setReportText] = useState('')
  const [reportPin, setReportPin] = useState('')
  const [reportCity, setReportCity] = useState('')
  const [reportDeliveryDays, setReportDeliveryDays] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [votes, setVotes] = useState({})
  const [editingReportId, setEditingReportId] = useState(null)
  const [editingText, setEditingText] = useState('')

  // ── Alerts ───────────────────────────────────────────────
  const [contact, setContact] = useState('')
  const [alertPin, setAlertPin] = useState('')
  const [alertDate, setAlertDate] = useState('')
  const [alertSaved, setAlertSaved] = useState(false)
  const [freeAlertSaving, setFreeAlertSaving] = useState(false)
  const [freeAlertError, setFreeAlertError] = useState('')

  // ── Payment ──────────────────────────────────────────────
  const [payContact, setPayContact] = useState('')
  const [payPin, setPayPin] = useState('')
  const [paying, setPaying] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [payError, setPayError] = useState('')

  // ── Admin ────────────────────────────────────────────────
  const [logoClicks, setLogoClicks] = useState(0)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminData, setAdminData] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // ── News ─────────────────────────────────────────────────
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [shortageSummary, setShortageSummary] = useState(null)
  const newsLastFetched = useRef(null)

  // ── Prices ───────────────────────────────────────────────
  const [mapPrices, setMapPrices] = useState({})
  const [pricesLastUpdated, setPricesLastUpdated] = useState(null)

  // ── Auth ─────────────────────────────────────────────────
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── UI ───────────────────────────────────────────────────
  const [showSupport, setShowSupport] = useState(false)

  // ── All handlers — PRESERVE EXACTLY ─────────────────────
  // (Copy all handlers from original App.jsx unchanged)
  // handleTrack, handleReport, handleEditReport, handleDeleteReport
  // handleVote, handlePayment, handleLogoClick, handleAdminUnlock
  // fetchNews — all go here

  // ── Render ───────────────────────────────────────────────
  const activeTabContent = {
    track:      <TrackTab {...trackProps} />,
    prices:     <PricesTab mapPrices={mapPrices} lastUpdated={pricesLastUpdated}
                           contact={contact} setContact={setContact}
                           alertSaved={alertSaved} setAlertSaved={setAlertSaved} />,
    community:  <ReportsTab {...reportsProps} />,
    news:       <NewsTab news={news} newsLoading={newsLoading}
                         onRefresh={() => fetchNews(true)} />,
    alerts:     <AlertsTab {...alertsProps} />,
    commercial: <CommercialPage prefilledCity={
                  pinData?.city
                    ? CITY_NORMALISE[pinData.city.split(',')[0].trim().toLowerCase()] || ''
                    : ''
                } />,
    admin:      adminUnlocked ? <AdminTab data={adminData} loading={adminLoading}
                                          onLock={() => { setAdminUnlocked(false); setTab('track') }} />
                              : null,
  }

  return (
    <>
      <div className="flex min-h-screen min-h-dvh">
        {/* Sidebar — desktop only */}
        <Sidebar
          tabs={TABS}
          activeTab={tab}
          onTabChange={setTab}
          user={user}
          authLoading={authLoading}
          logoClicks={logoClicks}
          onLogoClick={handleLogoClick}
          onSupportOpen={() => setShowSupport(true)}
        />

        {/* Main */}
        <div className="md:ml-[var(--sidebar-width)] flex-1 flex flex-col">
          {/* Topbar — mobile only */}
          <Topbar user={user} authLoading={authLoading} />

          {/* Content */}
          <main id="main-content"
            className="flex-1 px-4 md:px-11 pt-6 pb-20 md:pb-16 max-w-[var(--content-max)]"
            style={{
              paddingBottom: 'calc(80px + env(safe-area-inset-bottom))'
            }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={springs.smooth}
              >
                {activeTabContent[tab]}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* Support modal */}
      <AnimatePresence>
        {showSupport && (
          <SupportModal onClose={() => setShowSupport(false)} />
        )}
      </AnimatePresence>

      {/* Floating support FAB — mobile only */}
      <motion.button
        onClick={() => setShowSupport(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Support"
        className="md:hidden fixed z-[190] w-[42px] h-[42px] rounded-full
                   flex items-center justify-center
                   bg-[var(--bg-raised)] border border-[var(--border)]
                   text-[var(--text-secondary)] hover:text-[var(--accent)]
                   transition-colors duration-150"
        style={{
          bottom: 'calc(var(--bottomnav-height) + 14px + env(safe-area-inset-bottom))',
          right: '14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
        }}
      >
        <HelpCircle size={16} strokeWidth={1.8} />
      </motion.button>
    </>
  )
}
```

---

### Task 18 — Signal Room (Pre-PIN State)

```jsx
// src/features/track/SignalRoom.jsx
// The national live intelligence feed shown BEFORE user enters PIN
// This is the "control room of Indian LPG intelligence"

import { motion } from 'motion/react'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'

export function SignalRoom({ shortageSummary, mapPrices, reports }) {
  // Derive national stats
  const activeCities = shortageSummary?.activePinCount || 0
  const totalReports = shortageSummary?.totalReports || 0
  const cheapestPrice = Object.values(mapPrices).length > 0
    ? Math.min(...Object.values(mapPrices)
        .flatMap(c => Object.values(c).map(v => v.price))
        .filter(Boolean))
    : null

  const overallStatus = activeCities >= 5 ? 'severe'
    : activeCities >= 2 ? 'active'
    : activeCities >= 1 ? 'early'
    : 'clear'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={springs.arrival}
      className="mb-8"
    >
      {/* National status header */}
      <div className="flex items-center gap-3 mb-5">
        <StatusDot status={overallStatus} size={8} />
        <span className="font-data text-[11px] uppercase tracking-[0.14em]
                         text-[var(--text-muted)]">
          National LPG Intelligence · Live
        </span>
      </div>

      {/* Live stats */}
      <StaggerContainer staggerVal={0.14}
        className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            value: activeCities > 0 ? `${activeCities}` : '0',
            label: 'shortage zones',
            status: activeCities > 0 ? 'active' : 'clear',
          },
          {
            value: cheapestPrice ? `₹ ${cheapestPrice}` : '—',
            label: 'lowest price today',
            status: 'clear',
          },
          {
            value: totalReports > 0 ? `${totalReports}` : '0',
            label: 'community reports',
            status: totalReports > 10 ? 'early' : 'clear',
          },
        ].map(({ value, label, status }) => (
          <StaggerItem key={label}>
            <div className="rounded-lg border border-[var(--border)]
                            bg-[var(--bg-raised)] p-4">
              <div className="font-data text-[22px] font-bold
                              text-[var(--text-data)] leading-none mb-1">
                {value}
              </div>
              <div className="font-data text-[10px] uppercase
                              tracking-[0.08em] text-[var(--text-muted)]">
                {label}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Hotspot alert if active */}
      {shortageSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springs.delight}
          className="flex items-start gap-3 p-4 rounded-lg
                     border border-[var(--status-active-glow)]"
          style={{ background: 'rgba(139,58,42,0.08)' }}
        >
          <StatusDot status="active" size={7} className="mt-[2px]" />
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.12em]
                            text-[var(--status-active)] mb-1">
              Hotspot · {shortageSummary.hotspot}
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">
              <span className="font-data text-[var(--text-data)]">
                {shortageSummary.hotspotReports}
              </span>
              {' '}reports in the last 30 days.{' '}
              <span className="font-data text-[11px]
                               text-[var(--status-active)] uppercase tracking-[0.08em]">
                {shortageSummary.activePinCount} PIN{shortageSummary.activePinCount > 1 ? 's' : ''} affected.
              </span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Instruction */}
      <p className="text-[13px] text-[var(--text-muted)] mt-4 text-center">
        Enter your PIN below for intelligence specific to your area
      </p>
    </motion.div>
  )
}
```

---

### Task 19 — UrgencyScore

Copy the complete implementation from CONTEXT_3_MOTION_SYSTEM.md.
This is the dominant visual element on the Track tab result.
Build it exactly as specified with the count-up animation and ring draw.

The urgency scoring algorithm (PRESERVE THIS EXACTLY):
```js
export function computeUrgency({ cylinderLevel, daysLeft, reportCount, avgDays }) {
  let score = 0

  // Cylinder level
  const levelScore = { critical: 4, low: 3, half: 2, full: 1 }
  score += levelScore[cylinderLevel] || 0

  // Days to window
  if (daysLeft !== null) {
    if (daysLeft <= 0) score += 4
    else if (daysLeft <= 3) score += 3
    else if (daysLeft <= 7) score += 2
    else score += 1
  }

  // Shortage severity
  if (reportCount >= 5) score += 2
  else if (reportCount >= 2) score += 1
  else if (reportCount === 1) score += 0.5

  // Delivery lag
  if (avgDays > 7) score += 1

  // Hard overrides
  if (cylinderLevel === 'critical' && daysLeft <= 0) return 10
  if (cylinderLevel === 'critical' && daysLeft <= 3) return Math.max(8, Math.round(score))
  if (daysLeft <= 0) return Math.max(6, Math.round(score))
  if (cylinderLevel === 'full' && reportCount === 0) return Math.min(4, Math.round(score))

  return Math.min(10, Math.round(score))
}
```

---

### Task 20 — TrackTab

```jsx
// src/features/track/TrackTab.jsx
// The Signal Room concept:
// Pre-PIN: national intelligence feed + PIN input
// Post-PIN: local intelligence + urgency score

import { AnimatePresence, motion } from 'motion/react'
import { MapPin } from 'lucide-react'
import { SectionMarker } from '../../components/shared/SectionMarker'
import { LiquidGlassBtn } from '../../components/shared/LiquidGlassBtn'
import { UrgencyScore } from './UrgencyScore'
import { Ring } from '../../components/shared/Ring'
import { SignalRoom } from './SignalRoom'
import { PriceTicker } from '../../components/shared/PriceTicker'
import { SlideUp } from '../../components/motion/SlideUp'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { springs } from '../../lib/springs'
import { addDays, fmt } from '../../lib/utils'

export function TrackTab({
  pin, setPin, lastBooking, setLastBooking,
  pinData, bookingResult, loading, error,
  handleTrack, resultRef,
  shortageSummary, mapPrices, reports,
  onCommercialClick,
}) {
  return (
    <div>
      <SectionMarker
        status={pinData?.reportCount >= 5 ? 'severe'
              : pinData?.reportCount >= 2 ? 'active'
              : 'clear'}
        label="Track Your Area"
      />

      <h1 className="font-display font-extrabold text-[clamp(24px,4vw,36px)]
                     tracking-[-0.03em] text-[var(--text-primary)]
                     mb-2 leading-[1.1]">
        Booking Tracker
      </h1>
      <p className="text-[var(--text-secondary)] text-[15px] mb-6 max-w-[560px]">
        Know when to book. Know if there's a shortage.
        Real-time delivery intelligence by PIN code.
      </p>

      <PriceTicker mapPrices={mapPrices} />

      {/* Two column on desktop, single on mobile */}
      <div className="grid md:grid-cols-[420px_1fr] gap-5 items-start">

        {/* Left — Input + Signal Room */}
        <div>
          {/* Signal Room — pre-PIN national feed */}
          <AnimatePresence>
            {!pinData && !loading && (
              <SignalRoom
                shortageSummary={shortageSummary}
                mapPrices={mapPrices}
                reports={reports}
              />
            )}
          </AnimatePresence>

          {/* PIN Input Card */}
          <div className="rounded-lg border border-[var(--border)]
                          bg-[var(--bg-raised)] p-6 mb-4">
            <div className="font-data text-[10px] uppercase
                            tracking-[0.18em] text-[var(--accent)]
                            mb-4">
              Delivery Prediction
            </div>

            <div className="flex flex-col gap-2 mb-5">
              <label htmlFor="pin-input"
                className="font-data text-[11px] uppercase
                           tracking-[0.12em] text-[var(--text-secondary)]
                           font-bold">
                Where are you?
              </label>
              <input
                id="pin-input"
                className="block w-full min-h-[52px] px-4 py-3
                           font-data text-[20px] tracking-[0.12em]
                           text-[var(--text-data)]
                           bg-[var(--bg-inset)] border border-[var(--border)]
                           rounded-md focus:border-[var(--accent)]
                           focus:outline-none transition-colors duration-150"
                placeholder="Enter 6-digit PIN"
                value={pin}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
              />
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <label htmlFor="booking-date"
                className="font-data text-[11px] uppercase
                           tracking-[0.12em] text-[var(--text-secondary)]
                           font-bold">
                Last Booking Date{' '}
                <span className="text-[var(--text-muted)] normal-case
                                 tracking-normal font-normal">
                  (optional)
                </span>
              </label>
              <input
                id="booking-date"
                type="date"
                className="block w-full min-h-[48px] px-4 py-3
                           font-body text-[15px] text-[var(--text-primary)]
                           bg-[var(--bg-inset)] border border-[var(--border)]
                           rounded-md focus:border-[var(--accent)]
                           focus:outline-none transition-colors duration-150"
                value={lastBooking}
                onChange={e => setLastBooking(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-[12px] text-[var(--status-severe)] mb-3">
                {error}
              </p>
            )}

            <LiquidGlassBtn
              onClick={handleTrack}
              disabled={loading}
              className="w-full justify-center"
            >
              {loading ? 'Looking up…' : 'See what\'s happening →'}
            </LiquidGlassBtn>
          </div>
        </div>

        {/* Right — Results */}
        <div ref={resultRef} className="scroll-mt-[calc(var(--topbar-height)+8px)]">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="skeleton"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-lg border border-[var(--border)]
                           bg-[var(--bg-raised)] p-6">
                {[55, 100, 80, 90].map((w, i) => (
                  <div key={i}
                    className="h-[14px] rounded bg-[var(--bg-inset)]
                               animate-pulse mb-3"
                    style={{ width: `${w}%` }} />
                ))}
              </motion.div>
            )}

            {pinData && !loading && (
              <SlideUp key="result">
                {/* Location card */}
                <div className="rounded-lg border border-[var(--border)]
                                bg-[var(--bg-raised)] p-6 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={12}
                          style={{ color: 'var(--accent)' }} />
                        <span className="font-data text-[11px]
                                         text-[var(--accent)] uppercase
                                         tracking-[0.10em]">
                          {pinData.area || `PIN ${pinData.pin}`}
                        </span>
                      </div>
                      <div className="font-display font-bold text-[24px]
                                      tracking-[-0.02em]
                                      text-[var(--text-primary)]">
                        {pinData.city}
                      </div>
                    </div>
                    {/* Trend badge */}
                    <span className={`font-data text-[10px] uppercase
                                      tracking-[0.08em] px-2 py-1 rounded-pill
                                      ${pinData.trend === 'improving'
                                        ? 'text-[var(--status-clear)] bg-[var(--status-clear-glow)]'
                                        : pinData.trend === 'worsening'
                                          ? 'text-[var(--status-active)] bg-[var(--status-active-glow)]'
                                          : 'text-[var(--text-muted)] bg-[var(--bg-inset)]'
                                      }`}>
                      {pinData.trend === 'improving' ? '↑ Improving'
                        : pinData.trend === 'worsening' ? '↓ Worsening'
                        : '→ Stable'}
                    </span>
                  </div>

                  {/* Stats */}
                  {[
                    ['Avg Delivery', pinData.avg_days !== '—'
                      ? `${pinData.avg_days} days` : 'No data yet'],
                    ['Gas Agency', pinData.agency],
                    ['Shortage Status', (() => {
                      const n = pinData.reportCount
                      if (n === 0) return '● All clear'
                      if (n === 1) return `● Early signal (${n} report)`
                      if (n <= 4) return `● Active shortage (${n} reports)`
                      return `● Severe shortage (${n} reports)`
                    })()],
                  ].map(([label, value], i, arr) => (
                    <div key={label}
                      className={`flex justify-between items-start py-3
                                  ${i < arr.length - 1
                                    ? 'border-b border-[var(--divider)]'
                                    : ''}`}>
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {label}
                      </span>
                      <span className="font-data text-[14px] font-bold
                                       text-[var(--text-data)] text-right">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Urgency Score — only when cylinder level known */}
                {pinData.urgencyScore !== undefined && (
                  <div className="rounded-lg border border-[var(--border)]
                                  bg-[var(--bg-raised)] p-6 mb-4 text-center">
                    <div className="font-data text-[10px] uppercase
                                    tracking-[0.18em] text-[var(--accent)] mb-4">
                      Urgency Score
                    </div>
                    <UrgencyScore score={pinData.urgencyScore} />
                  </div>
                )}

                {/* Booking window */}
                {bookingResult && (
                  <div className={`rounded-lg border p-6 mb-4
                    ${bookingResult.daysLeft <= 0
                      ? 'border-[var(--status-clear-glow)] bg-[rgba(45,92,58,0.08)]'
                      : 'border-[var(--border)] bg-[var(--bg-raised)]'}`}>
                    <div className="font-data text-[10px] uppercase
                                    tracking-[0.18em] text-[var(--accent)] mb-4">
                      Your Booking Window
                    </div>
                    <div className="flex items-center gap-5">
                      <Ring daysLeft={bookingResult.daysLeft} />
                      <div>
                        <p className="font-data text-[11px] uppercase
                                      tracking-[0.08em] text-[var(--text-muted)] mb-1">
                          {bookingResult.daysLeft <= 0
                            ? 'Window is open now'
                            : 'Next window opens'}
                        </p>
                        <p className="font-display font-bold text-[22px]
                                      tracking-[-0.02em]"
                           style={{
                             color: bookingResult.daysLeft <= 0
                               ? 'var(--status-clear)'
                               : 'var(--text-primary)'
                           }}>
                          {bookingResult.daysLeft <= 0
                            ? 'Book right now'
                            : fmt(bookingResult.nextWindow)}
                        </p>
                        {bookingResult.daysLeft > 0 &&
                          pinData.avg_days !== '—' && (
                          <p className="font-data text-[11px]
                                        text-[var(--text-muted)] mt-2">
                            Est. delivery by{' '}
                            {fmt(addDays(bookingResult.nextWindow,
                              Math.round(pinData.avg_days)))}
                          </p>
                        )}
                        <KalamkariDivider />
                        <p className="font-data text-[10px]
                                      text-[var(--text-muted)]">
                          Based on 25-day rule +{' '}
                          <span className="text-[var(--text-data)]">
                            {pinData.avg_days}
                          </span>
                          -day local delivery lag
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shortage alert */}
                {pinData.reportCount >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springs.urgent}
                    className="flex items-start gap-3 p-4 rounded-lg
                               border mb-4"
                    style={{
                      borderColor: pinData.reportCount >= 5
                        ? 'var(--status-severe-glow)'
                        : 'var(--status-active-glow)',
                      background: pinData.reportCount >= 5
                        ? 'rgba(107,26,26,0.10)'
                        : 'rgba(139,58,42,0.08)',
                    }}
                  >
                    <StatusDot
                      status={pinData.reportCount >= 5 ? 'severe' : 'active'}
                      size={7}
                      className="mt-[3px]"
                    />
                    <div>
                      <div className="font-data text-[12px] uppercase
                                      tracking-[0.10em] mb-1"
                           style={{
                             color: pinData.reportCount >= 5
                               ? 'var(--status-severe)'
                               : 'var(--status-active)'
                           }}>
                        {pinData.reportCount >= 5
                          ? 'Severe shortage in your area'
                          : 'Active shortage in your area'}
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        Expect 3–7 extra days on delivery.
                        Book as early as your window allows.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Commercial nudge */}
                {pinData.reportCount >= 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ ...springs.arrival, delay: 0.4 }}
                    className="p-4 rounded-lg border
                               border-[var(--accent-glow)]
                               bg-[var(--accent-fog)]"
                  >
                    <p className="text-[13px] font-semibold
                                  text-[var(--text-primary)] mb-1">
                      Running a restaurant or hotel?
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                      Commercial gas cut across India.
                      Find verified alternatives today.
                    </p>
                    <button
                      onClick={onCommercialClick}
                      className="text-[12px] font-semibold
                                 text-[var(--accent)] hover:text-[var(--accent-pop)]
                                 transition-colors duration-150"
                    >
                      Find alternatives now →
                    </button>
                  </motion.div>
                )}
              </SlideUp>
            )}

            {/* Empty state */}
            {!pinData && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden md:flex flex-col items-center
                           justify-center py-12 text-center"
              >
                {/* Bespoke cylinder illustration */}
                <svg width="64" height="80" viewBox="0 0 64 80" fill="none"
                  className="mb-4 opacity-30">
                  <ellipse cx="32" cy="12" rx="24" ry="8"
                    stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                  <line x1="8" y1="12" x2="8" y2="62"
                    stroke="var(--accent)" strokeWidth="1.5" />
                  <line x1="56" y1="12" x2="56" y2="62"
                    stroke="var(--accent)" strokeWidth="1.5" />
                  <ellipse cx="32" cy="62" rx="24" ry="8"
                    stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                  <ellipse cx="32" cy="62" rx="24" ry="8"
                    fill="var(--accent)" opacity="0.15" />
                  <circle cx="32" cy="10" r="3"
                    fill="var(--accent)" opacity="0.6" />
                  <text x="32" y="40" textAnchor="middle"
                    fontFamily="var(--font-data)" fontSize="10"
                    fill="var(--text-muted)" letterSpacing="1">
                    ?
                  </text>
                </svg>
                <p className="font-body text-[var(--text-muted)] text-[13px]">
                  Enter your PIN for live intelligence
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
```

**CHECKPOINT 4:** Track tab complete.
Test the full flow: empty state → PIN entry → loading → results.
Signal Room should show national stats before PIN entry.
Result card should slide in with spring physics.
Urgency score should count up with ring draw.
Test in both light and dark mode.
Test on 390px viewport.
Fix before continuing.

---

### Tasks 21–26 — Remaining Feature Tabs

Build each remaining tab following the same patterns established in Tasks 18–20.

**Task 21 — PriceTicker component**
Scrolling price strip. Doubles items for seamless loop.
`motion.div` with `animate={{ x: [0, '-50%'] }}` infinite loop.
Pause on hover via `whileHover={{ animationPlayState: 'paused' }}`.
Each item: city in `text-[var(--text-muted)]`, price in `font-data text-[var(--text-data)]`.

**Task 22 — PricesTab**
Preserve existing Leaflet map implementation exactly.
Restyle the city popup and bottom sheet using Deeplight tokens.
Map tiles: Carto dark when `data-theme="dark"`, Carto light otherwise.
City dots: same colour logic (green/amber/red by price tier).
No glass on the map itself — only on the popup.

**Task 23 — ReportsTab**
Preserve all auth gate logic exactly.
Report cards use `content-visibility: auto` for performance.
Vote button gets a spring bounce on press:
`whileTap={{ scale: 1.15 }}` with `springs.delight`.
Trending badge for reports with >20 votes.

**Task 24 — NewsTab**
Section markers for each category: SHORTAGE SIGNALS, PRICE & RATES, POLICY, GENERAL.
Lead story: first article from highest priority category. Larger card.
General category: hidden by default, expandable via "Show general news" button.
WhatsApp share link preserved.

**Task 25 — AlertsTab**
Vertical single column (not 2-column grid).
Free alert card → gap nudge → Plus card → price revision alert.
Plus card: liquid glass CTA button.
Razorpay flow: all existing handlePayment logic preserved.

**Task 26 — Admin Tab**
Password prompt modal uses AnimatePresence.
Stats grid uses StaggerContainer.
Table uses font-data for all numbers.

---

## PHASE 5 — COMMERCIAL PAGE

### Tasks 27–30

The commercial page is the revenue engine.
Build it to the highest standard in the entire product.

**Task 27 — CommercialHero**
Full-bleed dark section.
Scroll-linked opacity/y/scale using `useScroll` + `useTransform`.
Live crisis badge: `● LIVE CRISIS · MARCH 2026` with pulse dot.
Headline split into two lines, each arriving 120ms apart.
Single liquid glass CTA button below.

**Task 28 — VendorCard**
StaggerItem wrapper for entrance animation.
Warm shadow bloom on hover.
Featured vendors: accent glow border + breathing animation.
WhatsApp button: primary. Call button: ghost. Website: icon only.

**Task 29 — LeadForm**
All fields with proper htmlFor/id pairs.
Need type: tappable buttons (not a dropdown).
City selector: syncs with vendor city tabs.
Form error: inline below the failed field.
Submit success: full-card success state with animation.

**Task 30 — City Tabs**
Horizontal scroll on mobile (7 cities, overflow-x: auto, scrollbar hidden).
`layoutId="city-indicator"` on active state for smooth sliding indicator.
Selecting a city triggers `whileInView` stats re-entrance.

**CHECKPOINT 5:** Commercial page complete.
Scroll storytelling works — hero fades as stats enter.
Vendor cards stagger in correctly.
Lead form submits to Supabase and shows success state.
City tabs scroll on 390px without overflow.

---

## PHASE 6 — POLISH & QA

### Task 31 — Modals

**SupportModal** — 4 sections: wrong price, billing, feedback, FAQ.
Bottom sheet on mobile (sheetUp spring animation).
Centered modal on desktop (scaleIn animation).
All form logic from original preserved exactly.

**AdminModal** — Password prompt.
`AnimatePresence` scale in/out.

### Task 32 — PriceTicker Polish

`prefers-reduced-motion`: slow to 60s duration, don't stop.
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const duration = prefersReduced ? 60 : 24
```

### Task 33 — index.html Updates

```html
<!-- Add to <head> -->
<meta name="theme-color" content="#0F0D14"
  media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#F5EFE4"
  media="(prefers-color-scheme: light)" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<!-- Keep existing: title, meta description, OG tags, JSON-LD, AdSense -->
```

### Task 34 — Accessibility Pass

Every component, run through this checklist:
```
□  Every input has htmlFor matching an id
□  Every icon-only button has aria-label
□  Every async button shows "ing…" loading state
□  Every animated component has useReducedMotion check
□  :focus-visible visible in both themes
□  All status conveyed by text + colour (never colour alone)
□  Topbar has safe-area-inset-top
□  Bottom nav has safe-area-inset-bottom
□  All tap targets ≥ 44px (52px on mobile)
```

### Task 35 — Final QA

```
□  Run on iPhone SE (375px) — nothing overflows
□  Run on iPhone 15 Pro Max (430px) — layout breathes
□  Run on mid-range Android 360px — Chrome rendering correct
□  Dark mode: every surface correct, no cold grays
□  Light mode: every surface correct, warm parchment tones
□  Theme toggle: switches instantly, no flash
□  Kalamkari texture: visible on close inspection in both modes
□  Liquid glass button: liquid distortion on hover
□  Status dots: all 4 states pulse correctly
□  Section markers: status dot + label + horizontal rule
□  Signal Room: shows before PIN entry, fades on entry
□  Urgency score: counts up with ring draw
□  Tab transitions: directional spring, no jarring
□  Vendor cards: stagger entrance, warm hover
□  Lead form: all validations, success state
□  Commercial hero: scroll parallax works
□  Razorpay: payment flow complete end to end
□  All Supabase queries: same as before, nothing changed
□  Admin Easter egg: 5x logo click still works
□  Performance: LCP < 2.5s on simulated 4G mobile
```

---

## THE FINAL TEST

Before shipping, ask yourself:

A restaurant owner in Hyderabad opens this at 7am.
They have no commercial gas. It's Ramzan.

1. Do they feel hope within 3 seconds of landing?
2. Does the Signal Room tell them something real before they even search?
3. Does the urgency score make their situation immediately clear?
4. Does the commercial page make them trust that help is available?
5. Would a vendor on a sales call want to be listed here?

If yes to all five — ship it.

If no to any — that screen needs more work.

---

## HANDOFF NOTES FOR LOGIC INTEGRATION

After Antigravity completes the visual build, the logic integration
(all Supabase handlers, edge function calls, auth flow) will be
handled separately. Do not attempt to guess at or rewrite any
of the preserved handlers.

Leave clearly marked TODO comments where handlers need to be wired:
```jsx
{/* TODO: wire handleTrack here */}
{/* TODO: wire handleReport here */}
{/* TODO: wire handlePayment here */}
```

The backend is live, tested, and working.
The surface is what we're building here.
The wiring comes next.
