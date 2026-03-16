# CylinderCheck — Antigravity Context Package
## READ THIS FILE FIRST. It tells you what order to read everything.

---

## What This Package Is

This is the complete context package for rebuilding CylinderCheck's
frontend from scratch. You are replacing the existing App.jsx and
index.css with a new architecture. The backend is untouched.

---

## The Product

CylinderCheck (cylindercheck.in) — India's LPG cylinder shortage tracker
and commercial kitchen alternative finder.

The user's emotional state when they land: anxiety about gas supply.
The feeling they should leave with: hope of finding legitimate cylinders.

---

## Read In This Order

### 1. CONTEXT_1_BACKEND_TOPOLOGY.md
What exists, what's wired, what you must never touch.
Read this first. Understand the engine before building the surface.

### 2. CONTEXT_2_DESIGN_SYSTEM.md
The Deeplight design language. Colours, typography, spacing,
components, Kalamkari texture, foggy glass system.
This is the visual law.

### 3. CONTEXT_3_MOTION_SYSTEM.md
The complete Motion (motion/react) implementation.
Every spring config, every animation variant, every component.
Named springs only. Never ad-hoc values.

### 4. CONTEXT_4_RULES_AND_ANTIPATTERNS.md
Hard constraints. What's explicitly forbidden.
What the current website does wrong (don't repeat it).
Accessibility requirements. Mobile rules for Indian users.
Performance budget.

---

## The Stack

```
Framework:     React 18 + Vite 5 (NOT Next.js)
Styling:       Tailwind CSS v4
Animation:     Motion (motion/react) v11+ — npm install motion
Components:    shadcn/ui (behaviour/accessibility only, visually overridden)
Icons:         Lucide React
Fonts:         Bricolage Grotesque + Instrument Sans (Google Fonts)
               + Geist Mono (npm install geist)
Backend:       Supabase — existing, untouched
Deploy:        Vercel
```

---

## The Design Language

**Name: Deeplight**
**One line: Hope arriving in darkness.**

Primary references:
- Aigle Rainpack Warm: https://www.aigle.com/fr/fr/rainpack-warm.html
- Dojigiri: https://dojigiri.com

Anti-reference: The existing cylindercheck.in — do not reproduce anything.

Visual DNA:
- Warm indigo-black surfaces (not gray, not pure black)
- Saffron-orange accent (#E07830)
- Foggy glass in 5 places only
- Kalamkari Indian textile texture in 3 places only
- Geist Mono for all data elements
- Motion-led — everything animated, nothing jarring

---

## The Boundary

**Antigravity builds:** Visual layer — components, styles, animations,
layouts, the Deeplight design system implementation.

**The existing logic stays intact:** All Supabase queries, handlers,
edge function calls, auth, payment flow. Move into new components
but never rewrite.

---

## Output

Produce the file structure defined in CONTEXT_2_DESIGN_SYSTEM.md.
Every component in a named file. No monolithic App.jsx.
Design tokens in src/lib/tokens.css.
Motion configs in src/lib/springs.js.

---

## The Bar

Build this to Awwwards Honorable Mention standard.
A restaurant owner in Hyderabad opens it during a crisis
and immediately trusts it.
A vendor on a sales call sees it and wants to be listed on it.

That is the bar. Hold yourself to it.
