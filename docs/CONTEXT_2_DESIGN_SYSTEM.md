# CylinderCheck — Deeplight Design System
## For Antigravity: This is the visual law. Every decision traces back here.
## Design language: DEEPLIGHT
## One-line brief: Hope arriving in darkness.

---

## WHAT DEEPLIGHT MEANS

Every visual decision passes one test:
**Does this feel like hope arriving in darkness?**

- Warm, not cold
- Organic, not geometric
- Indian luxury, not Western minimalism
- Premium crisis tool, not panic button
- The knowledgeable friend who gets the system

The user landing on CylinderCheck is anxious. They might be a
restaurant owner in Hyderabad during Ramzan with no commercial gas.
They might be a family who's been waiting 12 days for a cylinder.

They need to feel: legitimate help is within reach.
That is the single emotional north star.

---

## PRIMARY REFERENCES

1. Aigle Rainpack Warm — https://www.aigle.com/fr/fr/rainpack-warm.html
   Extract: full-bleed immersive layouts, liquid glass button,
   editorial typography, cinematic scroll, natural luxury palette

2. Dojigiri — https://dojigiri.com
   Extract: status-style section markers, data precision,
   information density without clutter, CTA hierarchy

Anti-reference: The existing cylindercheck.in website.
Do NOT reproduce anything from the current design.

---

## COLOUR SYSTEM — COMPLETE

### Dark Mode (default)

Inspired by: Kalamkari ink at night, Indian spice palette,
             warm candlelight on deep indigo cloth

```css
/* Surfaces */
--bg-base:      #0F0D14;  /* warm indigo-black. The depth. */
--bg-raised:    #181520;  /* slightly lifted surface */
--bg-inset:     #0A0810;  /* deepest. pressed into shadow */
--bg-glass:     rgba(24, 21, 32, 0.72); /* foggy glass. deep + diffused */

/* Glass layers — 3 tiers */
--glass-deep:   rgba(24, 21, 32, 0.85); /* topbar, bottom nav */
--glass-mid:    rgba(24, 21, 32, 0.65); /* floating cards, map popup */
--glass-whisper:rgba(224, 120, 48, 0.06); /* liquid glass CTA button ONLY */

/* Fog properties */
--fog-blur-deep:   blur(28px) saturate(130%);
--fog-blur-mid:    blur(20px) saturate(150%);
--fog-blur-button: blur(12px) saturate(160%);
--fog-border:      rgba(255, 220, 160, 0.08);  /* candlelight edge */
--fog-highlight:   rgba(255, 220, 160, 0.04);  /* inner glow */

/* Text */
--text-primary:   #F4EFE8;  /* warm ivory. Kalamkari parchment. */
--text-secondary: #A89880;  /* warm sand */
--text-muted:     #6B5E50;  /* warm earth */
--text-data:      #E8D4A8;  /* turmeric cream — ALL monospace/numbers */
--text-on-accent: #FFFFFF;

/* Accent — The Hope Colour */
--accent:         #E07830;  /* deep saffron. The flame. */
--accent-hover:   #CC6A22;  /* pressed */
--accent-soft:    rgba(224, 120, 48, 0.10);
--accent-glow:    rgba(224, 120, 48, 0.20);  /* the hope glow */
--accent-fog:     rgba(224, 120, 48, 0.06);  /* glass button surface */
--accent-pop:     #FF8C42;  /* hero moments ONLY */

/* Kalamkari palette — supporting colours */
--k-indigo:       #2D2449;  /* deep indigo. Section backgrounds */
--k-terracotta:   #8B3A2A;  /* burnt terracotta */
--k-turmeric:     #C4882A;  /* deep turmeric */
--k-forest:       #2A5C3A;  /* deep forest */
--k-cream:        #F0E6D0;  /* natural parchment */

/* Status — Kalamkari palette, not traffic lights */
--status-clear:        #6DB88A;  /* sage at dawn */
--status-clear-glow:   rgba(45, 92, 58, 0.25);
--status-early:        #E8A840;  /* turmeric in sunlight */
--status-early-glow:   rgba(196, 136, 42, 0.25);
--status-active:       #C45A38;  /* terracotta at dusk */
--status-active-glow:  rgba(139, 58, 42, 0.30);
--status-severe:       #B83030;  /* deep crimson */
--status-severe-glow:  rgba(107, 26, 26, 0.35);

/* Structure */
--border:         rgba(240, 230, 208, 0.08);  /* parchment hairline */
--divider:        rgba(240, 230, 208, 0.05);  /* barely visible */
--shadow-dark:    #07060A;
--shadow-glow:    rgba(224, 120, 48, 0.08);
```

### Light Mode

Inspired by: Kalamkari parchment in morning light,
             Indian handloom cream, turmeric and spice warmth

```css
--bg-base:      #F5EFE4;  /* Kalamkari parchment */
--bg-raised:    #FDFAF5;  /* cream card surfaces */
--bg-inset:     #EDE4D6;  /* warm pressed inputs */
--bg-glass:     rgba(253, 250, 245, 0.78);

--glass-deep:   rgba(245, 239, 228, 0.90);
--glass-mid:    rgba(253, 250, 245, 0.75);
--glass-whisper:rgba(196, 100, 26, 0.06);

--fog-border:   rgba(200, 160, 80, 0.15);
--fog-highlight:rgba(200, 160, 80, 0.08);

--text-primary:   #1C1610;
--text-secondary: #6B5040;
--text-muted:     #9A8070;
--text-data:      #5C3C18;  /* warm brown for numbers on light */

--accent:         #C4641A;  /* deeper saffron for light mode contrast */
--accent-hover:   #B05518;
--accent-soft:    rgba(196, 100, 26, 0.10);
--accent-glow:    rgba(196, 100, 26, 0.18);

--border:         rgba(180, 140, 80, 0.15);
--divider:        rgba(180, 140, 80, 0.08);
```

### Theme Toggle
```js
// Tailwind dark mode via selector strategy
// tailwind.config.js:
darkMode: ['selector', '[data-theme="dark"]']

// src/theme.js (DO NOT MODIFY — exists already)
// Controls data-theme on <html> element
// Reads/writes to localStorage key 'cc-theme'
// Default: 'dark'
```

---

## TYPOGRAPHY SYSTEM

### Font Stack
```css
--font-display:  'Bricolage Grotesque', sans-serif;
--font-body:     'Instrument Sans', sans-serif;
--font-data:     'Geist Mono', 'Fira Code', monospace;
```

Google Fonts import:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap&subset=latin" rel="stylesheet" />
```

Geist Mono via npm:
```bash
npm install geist
```
```js
// main.jsx
import { GeistMono } from 'geist/font/mono'
```

### Type Scale
```
Display:     Bricolage Grotesque 800  clamp(48px, 8vw, 96px)  — hero numbers, urgency score
Heading 1:   Bricolage Grotesque 700  clamp(28px, 4vw, 40px)  — page titles
Heading 2:   Bricolage Grotesque 700  clamp(22px, 3vw, 28px)  — section titles
Subheading:  Instrument Sans 600      16px                     — card titles
Body:        Instrument Sans 400      15px                     — content
Caption:     Instrument Sans 500      12px                     — meta info
Label:       Instrument Sans 700      11px uppercase 0.12em    — form labels, badges
Data:        Geist Mono 500           14px                     — ALL numbers, PINs, prices
Data Small:  Geist Mono 400           12px                     — timestamps, counts
```

### The Data Rule — Critical
Every single number, price, PIN code, date, count, score, percentage
MUST use Geist Mono. This distinction is what makes CylinderCheck
look like a professional intelligence platform.

Examples:
- `530001` — Geist Mono
- `₹ 901` — Geist Mono (with space between ₹ and number)
- `6 days` — "6" in Geist Mono, "days" in Instrument Sans
- `7 / 10` — entire string Geist Mono
- `2h ago` — Geist Mono
- `12 reports` — "12" in Geist Mono

---

## SPACING SYSTEM

8px base. Never deviate.
```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

---

## BORDER RADIUS

```
--radius-sm:   6px   — small elements (badges, inputs)
--radius-md:   12px  — cards, buttons, form fields
--radius-lg:   18px  — large cards, panels
--radius-xl:   24px  — modals, bottom sheets
--radius-pill: 9999px — pills, tags, city tabs
```

Nested radius rule: child radius ≤ parent radius.
A card (18px) contains an input (12px) contains text (0px). Always.

---

## KALAMKARI TEXTURE SYSTEM

Kalamkari is a centuries-old Indian hand-painted textile art from
Andhra Pradesh — specifically from the same regions as our target users.

### Integration Rules

**Rule 1 — Invisible at first glance**
Max opacity 4% on dark mode, 5% on light mode.
It adds warmth subconsciously before the eye finds it consciously.

**Rule 2 — SVG only, not image**
Hand-built as inline SVG. Scalable, themeable, zero file weight.
Pattern: simplified vine and lotus motif. Distilled, not reproduced.

**Rule 3 — Three touchpoints ONLY**
1. Background base texture (opacity 4%)
2. Section dividers (1px line + small vine motif at left end)
3. Flame icon (peacock feather curve informs the flame shape)

**Rule 4 — Nowhere else**
Not on cards. Not on buttons. Not on the map. Just these three places.
Restraint is luxury.

### SVG Pattern
```svg
<!-- Kalamkari vine pattern — use as SVG background fill -->
<!-- Simplified to geometric essence. Repeat at 120px x 120px -->
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
  <path d="M20 60 C20 40 40 20 60 20 C80 20 100 40 100 60
           C100 80 80 100 60 100 C40 100 20 80 20 60Z"
        fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
  <path d="M60 10 C60 10 50 30 60 50 C70 30 60 10 60 10Z"
        fill="currentColor" opacity="0.3"/>
  <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.3"/>
  <path d="M10 60 C30 50 50 55 60 60 C50 65 30 70 10 60Z"
        fill="currentColor" opacity="0.25"/>
  <path d="M110 60 C90 50 70 55 60 60 C70 65 90 70 110 60Z"
        fill="currentColor" opacity="0.25"/>
</svg>
```

Usage in CSS:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...kalamkari-svg...");
  background-size: 120px 120px;
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
}
```

---

## THE FOGGY GLASS SYSTEM

This is the signature surface element. Used in exactly 5 places:

1. Topbar (mobile) — deep fog
2. Bottom nav (mobile) — deep fog
3. Map city popup — mid fog
4. Commercial hero card — mid fog
5. Primary CTA button — whisper glass (liquid glass effect)

```css
/* Deep Fog — persistent chrome */
.glass-deep {
  backdrop-filter: blur(28px) saturate(130%);
  background: var(--glass-deep);
  border: 1px solid var(--fog-border);
}

/* Mid Fog — floating elements */
.glass-mid {
  backdrop-filter: blur(20px) saturate(150%);
  background: var(--glass-mid);
  border: 1px solid var(--fog-border);
}

/* Whisper Glass — The Liquid Glass CTA Button */
/* This is the Aigle Rainpack Warm effect. */
/* Applied to primary CTA buttons ONLY. */
.glass-btn {
  backdrop-filter: blur(12px) saturate(160%);
  background: var(--glass-whisper);
  border: 1px solid rgba(224, 120, 48, 0.22);
  /* SVG displacement filter for liquid distortion on hover */
  /* See CONTEXT_3_MOTION_SYSTEM.md for hover implementation */
}
```

---

## STATUS INDICATOR SYSTEM

Status is a living object, not a badge.

### Structure
```
[pulse-ring-outer] [pulse-ring-inner] [dot-core] [status-text]
```

### Four States
```
● LIVE · ALL CLEAR
  dot: --status-clear (#6DB88A)
  ring: --status-clear-glow
  pulse: 2.8s ease-in-out infinite
  label: "ALL CLEAR"

● LIVE · EARLY SIGNAL
  dot: --status-early (#E8A840)
  ring: --status-early-glow
  pulse: 2.2s
  label: "EARLY SIGNAL"

● LIVE · ACTIVE SHORTAGE
  dot: --status-active (#C45A38)
  ring: --status-active-glow
  pulse: 1.6s
  label: "ACTIVE SHORTAGE"

● LIVE · SEVERE SHORTAGE
  dot: --status-severe (#B83030)
  ring: --status-severe-glow
  pulse: 0.9s  (fastest — most urgent)
  label: "SEVERE SHORTAGE"
```

### Section Markers (Dojigiri-inspired, luxury version)
Replace all standard h1/h2 section titles with status markers:
```
● LIVE · TRACK YOUR AREA
● SHORTAGE SIGNALS · COMMUNITY REPORTS
● ALTERNATIVES · FOR BUSINESSES
● LIVE PRICES · 12 CITIES
● INTELLIGENCE · LPG NEWS
```

Format: dot + "LIVE" or status label + thin horizontal rule extending right
Typography: Geist Mono 11px uppercase 0.12em letter-spacing
Colour: --text-muted for the text, status colour for the dot

---

## COMPONENT STANDARDS

### Cards
```css
/* Standard card */
.card {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);  /* 18px */
  padding: 24px;
}

/* Card on mobile */
@media (max-width: 768px) {
  .card { padding: 16px; border-radius: 14px; }
}

/* Featured card (vendor, Plus) */
.card-featured {
  border-color: var(--accent-glow);
  box-shadow: 0 0 0 1px var(--accent-glow), 0 8px 32px var(--shadow-glow);
}
```

### Buttons
```css
/* Primary CTA — liquid glass treatment */
.btn-primary {
  /* Liquid glass surface */
  backdrop-filter: blur(12px) saturate(160%);
  background: var(--glass-whisper);
  border: 1px solid rgba(224, 120, 48, 0.22);
  /* Typography */
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-pop);
  /* Layout */
  min-height: 52px;
  padding: 0 28px;
  border-radius: var(--radius-md);
}

/* Secondary / Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  min-height: 48px;
  padding: 0 20px;
  border-radius: var(--radius-md);
}

/* Mobile bump */
@media (max-width: 768px) {
  .btn-primary, .btn-ghost {
    min-height: 56px;
    font-size: 16px;  /* prevents iOS zoom */
  }
}
```

### Inputs
```css
.input {
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  min-height: 48px;
  padding: 14px 16px;
  width: 100%;
  /* Focus: accent line draws from left */
  transition: border-color 220ms ease;
}

.input:focus {
  border-color: var(--accent);
  outline: none;
}

@media (max-width: 768px) {
  .input { font-size: 16px; min-height: 52px; }
  /* 16px required — prevents iOS Safari auto-zoom */
}
```

### Badges / Tags
```css
.badge {
  font-family: var(--font-data);  /* Geist Mono */
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}
```

---

## LAYOUT SYSTEM

### Breakpoints (mobile-first)
```
Default:    < 640px   (small mobile — the Jio phone user)
sm:         640px+    (tablet, large mobile)
md:         768px+    (desktop triggers: sidebar, grids)
lg:         1024px+   (standard desktop)
xl:         1280px+   (wide desktop)
```

### App Shell
```
Mobile (< 768px):
  - Topbar: sticky, glass-deep, 56px height + safe-area-inset-top
  - Content: full width, padding-bottom clears bottom nav
  - Bottom nav: fixed, glass-deep, 64px + safe-area-inset-bottom

Desktop (≥ 768px):
  - Sidebar: fixed left, 240px wide, solid bg-raised
  - Main: margin-left 240px
  - No topbar, no bottom nav
```

### Safe Areas (Indian phones have notches)
```css
.topbar    { padding-top: env(safe-area-inset-top); }
.bottom-nav { padding-bottom: calc(6px + env(safe-area-inset-bottom)); }
.content   { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
```

### Content Max Width
```css
.content-max { max-width: 1080px; margin-inline: auto; }
```

---

## EMPTY STATES

Every empty state must have:
1. A bespoke SVG illustration (cylinder-based, Kalamkari-informed shapes)
2. A warm, human headline (not "No data found")
3. A helpful description
4. A clear next action

### Empty State Copy
```
No PIN searched:
  Headline: "Where are you?"
  Sub: "Enter your PIN to see live intelligence for your area."

No shortage in area:
  Headline: "You're good."
  Sub: "No reported shortages in your PIN zone in the last 30 days."

No vendors in city:
  Headline: "Coming to [City] soon."
  Sub: "Submit your request and we'll match you manually within 24 hours."

No news:
  Headline: "All quiet."
  Sub: "No LPG news in the last 48 hours. Try refreshing."
```

---

## FILE OUTPUT STRUCTURE

Build this exact structure:
```
src/
├── main.jsx                    (preserve exactly — only add font import)
├── supabaseClient.js           (DO NOT MODIFY)
├── theme.js                    (DO NOT MODIFY)
│
├── lib/
│   ├── tokens.css              (all CSS variables above)
│   ├── springs.js              (see CONTEXT_3_MOTION_SYSTEM.md)
│   ├── animations.js           (reusable motion variants)
│   └── utils.js                (addDays, fmt, daysUntil, fmtDateTime, lookupPIN)
│
├── components/
│   ├── ui/                     (shadcn primitives — accessibility only)
│   ├── motion/                 (reusable motion wrappers)
│   │   ├── FadeIn.jsx
│   │   ├── SlideUp.jsx
│   │   ├── StaggerContainer.jsx
│   │   └── CountUp.jsx
│   │
│   ├── layout/
│   │   ├── AppShell.jsx        (sidebar + topbar + bottom nav)
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── BottomNav.jsx
│   │
│   ├── shared/
│   │   ├── StatusDot.jsx       (living status indicator)
│   │   ├── SectionMarker.jsx   (● LIVE · LABEL format)
│   │   ├── LiquidGlassBtn.jsx  (THE signature button)
│   │   ├── KalamkariDivider.jsx
│   │   ├── Ring.jsx            (booking window progress ring)
│   │   ├── PriceTicker.jsx
│   │   ├── AdSlot.jsx
│   │   └── ThemeToggle.jsx
│   │
│   └── modals/
│       ├── SupportModal.jsx
│       └── AdminModal.jsx
│
├── features/
│   ├── track/
│   │   ├── TrackTab.jsx        (Signal Room + PIN lookup)
│   │   ├── SignalRoom.jsx      (national live feed — pre-PIN state)
│   │   ├── UrgencyScore.jsx    (the dominant result element)
│   │   ├── BookingWindow.jsx
│   │   └── ShortageAlert.jsx
│   │
│   ├── reports/
│   │   └── ReportsTab.jsx
│   │
│   ├── prices/
│   │   └── PricesTab.jsx       (includes PricesMap with Leaflet)
│   │
│   ├── news/
│   │   └── NewsTab.jsx
│   │
│   ├── alerts/
│   │   └── AlertsTab.jsx
│   │
│   └── commercial/
│       ├── CommercialPage.jsx
│       ├── VendorCard.jsx
│       └── LeadForm.jsx
│
└── App.jsx                     (tab routing + global state + data fetches)
```

---

## TAILWIND CONFIG

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Map all CSS tokens to Tailwind utilities
        // bg-base, bg-raised, etc.
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body: ['Instrument Sans', 'sans-serif'],
        data: ['Geist Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px', md: '12px', lg: '18px', xl: '24px',
      },
    },
  },
  plugins: [],
}
```
