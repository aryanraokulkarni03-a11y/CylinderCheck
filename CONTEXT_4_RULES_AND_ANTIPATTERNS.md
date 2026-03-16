# CylinderCheck — Rules & Anti-Patterns
## For Antigravity: These are hard constraints. Not suggestions.
## Break any of these and the output is wrong.

---

## THE 5 LAWS

### Law 1 — Deeplight First
Every single decision — colour, spacing, motion, copy —
must pass the Deeplight test:
"Does this feel like hope arriving in darkness?"

If you're unsure: make it warmer, slower, and more organic.

### Law 2 — The Backend Is Sacred
Do not modify any logic in: handleTrack, handleReport,
handleEditReport, handleDeleteReport, handleVote, handlePayment,
handleLogoClick, handleAdminUnlock, fetchNews, lookupPIN, loadRazorpay.

Move them. Wrap them. Never rewrite them.

### Law 3 — Monospace For Data, Always
Every number, price, PIN, date, count, score uses Geist Mono.
No exceptions. This is the clearest signal of professionalism.

### Law 4 — Glass In 5 Places Only
Topbar, bottom nav, map popup, commercial hero, liquid glass button.
Nowhere else. Restraint makes the glass meaningful.

### Law 5 — Kalamkari In 3 Places Only
Background texture, section dividers, flame icon.
Nowhere else. More would be kitsch.

---

## EXPLICIT ANTI-PATTERNS

Things that exist on the current website that must NOT appear
in the new design:

```
❌  Neumorphic shadows (the dual-shadow pressed-in look)
❌  Mid-gray surfaces (#e2e5e8 bg-base) — too cold, too corporate
❌  Inline style={{ color: "#hexcode" }} — always use CSS tokens
❌  Generic spinner loading states — use skeleton screens
❌  Bare horizontal rules as dividers — use KalamkariDivider
❌  Standard h1/h2/h3 section headers — use SectionMarker
❌  Flat, non-animated content that just "appears"
❌  Orange that shouts (#FF6B00 raw) — use --accent (#E07830)
❌  White text on white — check contrast before shipping
❌  Hover effects on touch devices — gate with @media (hover: hover)
❌  Generic empty states ("No data found") — use Deeplight copy
❌  Cards that all look the same visual weight
❌  Borders that are sharp and cold — use warm rgba borders
❌  Stark white (#FFFFFF) anywhere in dark mode
❌  Cool gray text — all grays have warm brown undertone
❌  AI purple/pink gradients — not our palette
❌  Inter font — we use Bricolage + Instrument + Geist Mono
❌  Tailwind default colors (gray-500, blue-600 etc) — use tokens
❌  Hardcoded colors in JSX — always var(--token-name)
❌  transition: all — explicitly list properties only
❌  animation: none for prefers-reduced-motion — slow, don't stop
❌  Multiple CTAs competing on same screen
❌  Padding-less cards on mobile — minimum 16px
❌  Font size below 12px anywhere
❌  Input font size below 16px on mobile (causes iOS zoom)
```

---

## ACCESSIBILITY NON-NEGOTIABLES

These ship with every single component. No exceptions.

```
✅  Every <input> has an associated <label htmlFor="id">
✅  Every icon-only button has aria-label="Description"
✅  Every async button shows loading state: "Saving…" not spinner-only
✅  Every form field can show an inline error below it
✅  :focus-visible ring on every interactive element
✅  Minimum tap target 44×44px (52px on mobile)
✅  touch-action: manipulation on all buttons and links
✅  -webkit-tap-highlight-color: transparent on all interactive elements
✅  color is never the only signal — always text label too
✅  env(safe-area-inset-*) on topbar, bottom nav, modals
✅  aria-live="polite" on dynamic content regions
✅  useReducedMotion() checked in every animated component
```

---

## COPY VOICE RULES

The current website writes like a product spec.
The new website writes like a knowledgeable friend.

```
NEVER:
❌  "Enter your 6-digit PIN code"
❌  "No data yet for this area"
❌  "Something went wrong. Please try again."
❌  "Check My Area →" (generic)
❌  "Submit Report →" (bureaucratic)

ALWAYS:
✅  "Where are you?" (PIN input label)
✅  "Nothing in your area yet. Be the first to report." (empty state)
✅  "That didn't work — check your connection and try again." (error)
✅  "See what's happening →" (CTA)
✅  "Flag this issue →" (report CTA)
```

Number formatting:
```
₹ 901       — space between ₹ and number (non-breaking space: ₹&nbsp;901)
6 days      — space, lowercase
7 / 10      — spaces around slash
12 reports  — space, lowercase
530001      — no spaces in PIN
```

---

## MOBILE RULES — INDIAN USERS SPECIFICALLY

Indian mobile context is different from Western mobile context:
- Jio 4G is the dominant network — fast but variable latency
- Mid-range Android (₹10,000–20,000 phones) is the primary device
- Chrome Android is the dominant browser (85%+ market share)
- Samsung Internet has meaningful share
- Many users have "Bold text" accessibility setting enabled

Therefore:
```
✅  Test at CPU 4x throttle + Fast 3G in DevTools
✅  Total first load < 500KB
✅  Leaflet loaded conditionally (only Prices/News tab)
✅  Razorpay script loaded on-demand (only when paying)
✅  Images: WebP, explicit width/height, lazy except above fold
✅  Fonts: display=swap, preconnect to fonts.googleapis.com
✅  Skeletons: exact dimensions matching real content (prevents CLS)
✅  All text readable at "Bold text" accessibility setting
✅  Bottom nav items reachable with right thumb from bottom-right corner
✅  Hindi/regional language content never broken by font rendering
```

---

## DARK MODE RULES

Dark mode is the DEFAULT experience.
Light mode is a toggle option.

```
✅  data-theme="dark" on <html> by default (set in theme.js)
✅  Every color uses CSS tokens — never hardcode in JSX or Tailwind classes
✅  Tailwind darkMode: ['selector', '[data-theme="dark"]']
✅  Test every new component in BOTH modes before shipping
✅  Skeleton shimmer visible in both modes
✅  Status colors readable at WCAG AA in both modes
✅  Glass effects have different blur/opacity in light vs dark
❌  Never use Tailwind's dark: prefix — use CSS tokens instead
```

---

## PERFORMANCE BUDGET

```
Initial JS bundle (gzipped):    < 220KB
Critical CSS:                   < 20KB (Tailwind purged)
Total first load:               < 500KB
LCP:                            < 2.5s on 4G mobile
INP:                            < 200ms
CLS:                            < 0.1
Fonts:                          ≤ 3 families, ≤ 5 weights total
Third-party scripts:            Load after hydration
```

---

## VERCEL DEPLOYMENT REQUIREMENTS

Add this `vercel.json` at project root:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).css",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

Vite build optimisation:
```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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

---

## WHAT SUCCESS LOOKS LIKE

When this is built correctly:

1. A restaurant owner in Hyderabad opens the site at 7am
   and immediately feels: "this is real, this knows what it's doing"

2. They enter their PIN and the urgency score animates in —
   they understand their situation without reading a word

3. They tap "Find Alternatives" and the commercial page
   loads with vendor cards that look trustworthy and professional

4. A vendor on a call with the founder sees the site and says:
   "this looks like it's worth listing on"

5. Someone shares a screenshot of the shortage status
   and it looks distinctive enough to be recognised

6. The site wins an Awwwards Honorable Mention

That last one is the bar. Build to that standard.
