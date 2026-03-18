# CylinderCheck — Motion System (Deeplight)
## For Antigravity: Every animation in the product traces back to this file.
## Library: Motion (motion/react) v11+
## Install: npm install motion

---

## THE MOTION PHILOSOPHY

Hope doesn't snap. It unfolds.
Hope doesn't rush. It arrives with intention.
Hope doesn't shout. It beckons.

Every animation is filtered through this:
Does this feel like good news arriving with care?

**One absolute rule:**
Only animate `transform` and `opacity`.
Never animate `width`, `height`, `top`, `left`, `margin`, `padding`.
Those cause layout reflow. They will break Core Web Vitals INP.

---

## IMPORT

```js
import { motion, AnimatePresence, useMotionValue,
         useTransform, useScroll, animate } from 'motion/react'
```

---

## SPRING CONFIGS — Named, Never Ad-Hoc

Never write `stiffness: 400` inline. Always use these named configs.
This is what makes the entire product feel coherent.

```js
// src/lib/springs.js

export const springs = {

  // Buttons, toggles, interactive controls
  // Fast response, satisfying physical feel
  response: {
    type: 'spring',
    stiffness: 420,
    damping: 28,
  },

  // Cards, panels, modals entering
  // Smooth arrival, settles gently
  smooth: {
    type: 'spring',
    stiffness: 280,
    damping: 28,
  },

  // Main content, page-level transitions
  // Unhurried. Like good news being delivered.
  arrival: {
    type: 'spring',
    stiffness: 200,
    damping: 26,
    mass: 1,
  },

  // Data reveals — urgency score, stats counting in
  // Slow start, builds momentum, settles precisely
  reveal: {
    type: 'spring',
    stiffness: 160,
    damping: 22,
  },

  // Success states, all-clear moments
  // Slight bounce. The relief feeling.
  delight: {
    type: 'spring',
    stiffness: 300,
    damping: 18,
  },

  // Shortage alerts, severe warnings
  // Precise, no bounce. This is serious.
  urgent: {
    type: 'spring',
    stiffness: 380,
    damping: 32,
  },

  // Bottom sheets, modals
  // Feels physical coming up from below
  sheet: {
    type: 'spring',
    stiffness: 320,
    damping: 28,
  },
}
```

---

## TIMING — Non-Spring Durations

```js
export const timing = {
  instant:   0.08,   // press feedback
  fast:      0.15,   // hover states
  base:      0.22,   // standard transitions
  slow:      0.40,   // page-level
  cinematic: 0.90,   // entry sequences (worth it)
}

export const easing = {
  out:    [0.4, 0, 0.2, 1],    // things appearing
  in:     [0.4, 0, 1, 1],      // things disappearing
  bounce: [0.34, 1.2, 0.64, 1], // delightful moments
  data:   [0.25, 0.1, 0.25, 1], // count-up animations
}
```

---

## STAGGER SYSTEM

```js
export const stagger = {
  cards:   0.08,   // vendor cards, report cards
  stats:   0.14,   // stat numbers (each is a revelation)
  nav:     0.035,  // navigation items
  list:    0.06,   // list items
  chars:   0.03,   // character-by-character text
}
```

---

## ANIMATION VARIANTS — Reusable

```js
// src/lib/animations.js

// Standard fade up — most common entrance
export const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

// Slide in from right — vendor cards, side panels
export const slideRight = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
}

// Scale in — modals, success states
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

// Stagger container
export const staggerContainer = (staggerVal = 0.08) => ({
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: staggerVal },
  },
})

// Tab transition — directional
export const tabTransition = (direction = 1) => ({
  initial: { opacity: 0, x: 12 * direction },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -12 * direction },
})
```

---

## COMPONENT IMPLEMENTATIONS

### 1. LiquidGlassBtn — The Signature Element

```jsx
// src/components/shared/LiquidGlassBtn.jsx
import { motion } from 'motion/react'
import { springs } from '../../lib/springs'

export function LiquidGlassBtn({ children, onClick, className, ...props }) {
  return (
    <motion.button
      onClick={onClick}
      className={`glass-btn relative overflow-hidden ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97, y: 1 }}
      transition={springs.response}
      {...props}
    >
      {/* SVG liquid distortion filter */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        <filter id="liquid">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.02 0.05"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#liquid)" opacity="0.3" />
      </svg>

      {/* Accent glow on hover */}
      <motion.span
        className="absolute inset-0 rounded-[inherit]"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: timing.fast }}
        style={{
          background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
        }}
      />

      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  )
}
```

### 2. StatusDot — Living Status Indicator

```jsx
// src/components/shared/StatusDot.jsx
import { motion } from 'motion/react'

const statusConfig = {
  clear:   { color: 'var(--status-clear)',   glow: 'var(--status-clear-glow)',   duration: 2.8 },
  early:   { color: 'var(--status-early)',   glow: 'var(--status-early-glow)',   duration: 2.2 },
  active:  { color: 'var(--status-active)',  glow: 'var(--status-active-glow)',  duration: 1.6 },
  severe:  { color: 'var(--status-severe)',  glow: 'var(--status-severe-glow)',  duration: 0.9 },
}

export function StatusDot({ status = 'clear', size = 8 }) {
  const config = statusConfig[status]

  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {/* Outer ring — slower, larger */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: config.color }}
        animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
        transition={{
          duration: config.duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.4,
        }}
      />
      {/* Inner ring */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: config.color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
        transition={{
          duration: config.duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Core dot */}
      <span
        className="relative rounded-full w-full h-full"
        style={{
          background: config.color,
          boxShadow: `0 0 ${size}px ${config.glow}`,
        }}
      />
    </span>
  )
}
```

### 3. CountUp — For Urgency Score, Stats

```jsx
// src/components/motion/CountUp.jsx
import { useEffect, useRef } from 'react'
import { useMotionValue, useTransform, animate, motion } from 'motion/react'
import { easing } from '../../lib/springs'

export function CountUp({ to, duration = 1.4, className }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    animate(count, to, {
      duration,
      ease: easing.data,
    })
  }, [to, duration, count])

  return (
    <motion.span className={className}>
      {rounded}
    </motion.span>
  )
}
```

### 4. StaggerContainer — Card Grids

```jsx
// src/components/motion/StaggerContainer.jsx
import { motion } from 'motion/react'
import { stagger } from '../../lib/springs'

export function StaggerContainer({ children, staggerVal, className }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden:  { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerVal ?? stagger.cards },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Pair with StaggerItem:
export function StaggerItem({ children, className }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 28 } },
      }}
    >
      {children}
    </motion.div>
  )
}
```

### 5. SlideUp — Standard Entrance

```jsx
// src/components/motion/SlideUp.jsx
import { motion } from 'motion/react'
import { springs } from '../../lib/springs'

export function SlideUp({ children, delay = 0, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.arrival, delay }}
    >
      {children}
    </motion.div>
  )
}
```

### 6. Tab Transitions — AnimatePresence

```jsx
// In App.jsx — tab content transitions
import { AnimatePresence, motion } from 'motion/react'
import { springs } from './lib/springs'

// Wrap active tab content:
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={springs.smooth}
  >
    {/* active tab content */}
  </motion.div>
</AnimatePresence>
```

### 7. Scroll-Linked Hero — Commercial Page

```jsx
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

export function CommercialHero({ children }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])
  const y = useTransform(scrollYProgress, [0, 0.4], [0, -48])
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.97])

  return (
    <div ref={ref} className="relative min-h-[80vh] flex items-center">
      <motion.div style={{ opacity, y, scale }}>
        {children}
      </motion.div>
    </div>
  )
}
```

### 8. Viewport Trigger — whileInView

```jsx
// Stats that count when scrolled into view
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={springs.arrival}
>
  <CountUp to={8000} />
  <span>+ affected businesses</span>
</motion.div>
```

### 9. Card Hover — Warm Shadow Bloom

```jsx
<motion.div
  className="card"
  whileHover={{ y: -3 }}
  whileTap={{ y: 0, scale: 0.99 }}
  transition={springs.response}
  style={{
    // Warm shadow bloom on hover via CSS custom property
  }}
>
  {children}
</motion.div>
```

```css
/* CSS for the warm shadow bloom */
.card {
  transition: box-shadow 220ms ease;
}

.card:hover {
  box-shadow:
    0 8px 32px rgba(224, 120, 48, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.24);
}
```

### 10. App Entry Sequence

```jsx
// In App.jsx — fires once on mount
// Total duration: ~900ms

const [isLoaded, setIsLoaded] = useState(false)

useEffect(() => {
  // Small delay to ensure fonts loaded
  setTimeout(() => setIsLoaded(true), 100)
}, [])

// Wrap entire app:
<AnimatePresence>
  {isLoaded && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: easing.out }}
    >
      <AppShell />
    </motion.div>
  )}
</AnimatePresence>
```

---

## URGENCY SCORE — Full Implementation

The dominant visual element on the Track tab result.

```jsx
// src/features/track/UrgencyScore.jsx
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { springs, easing } from '../../lib/springs'

const scoreConfig = {
  low:     { color: 'var(--status-clear)',  label: "You're good",  bg: 'var(--k-forest)' },
  medium:  { color: 'var(--status-early)',  label: 'Plan ahead',   bg: 'var(--k-indigo)' },
  high:    { color: 'var(--status-active)', label: 'Book soon',    bg: 'var(--k-terracotta)' },
  critical:{ color: 'var(--status-severe)', label: 'Book right now', bg: '#3D0A0A' },
}

function getConfig(score) {
  if (score <= 3) return scoreConfig.low
  if (score <= 6) return scoreConfig.medium
  if (score <= 8) return scoreConfig.high
  return scoreConfig.critical
}

export function UrgencyScore({ score }) {
  const config = getConfig(score)
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)
  const hasRun = useRef(false)

  // Ring values
  const r = 52
  const circumference = 2 * Math.PI * r
  const ringProgress = useMotionValue(0)
  const strokeDashoffset = useTransform(
    ringProgress,
    [0, 1],
    [circumference, circumference * (1 - score / 10)]
  )

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Count up the number
    animate(count, score, { duration: 1.4, ease: easing.data })

    // Draw the ring simultaneously
    animate(ringProgress, 1, { duration: 1.4, ease: easing.data })
  }, [score, count, ringProgress])

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springs.reveal}
    >
      {/* Ring */}
      <div className="relative">
        <svg width="130" height="130" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          {/* Progress */}
          <motion.circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke={config.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            transform="rotate(-90 60 60)"
          />
          {/* Score number — Geist Mono */}
          <motion.text
            x="60" y="55"
            textAnchor="middle"
            fill={config.color}
            fontSize="32"
            fontWeight="700"
            fontFamily="'Geist Mono', monospace"
          >
            {rounded}
          </motion.text>
          <text
            x="60" y="73"
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="9"
            letterSpacing="1.5"
            fontFamily="'Geist Mono', monospace"
          >
            OUT OF 10
          </text>
        </svg>
      </div>

      {/* Label */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.arrival, delay: 0.8 }}
      >
        <div
          className="text-sm font-semibold uppercase tracking-widest font-data"
          style={{ color: config.color }}
        >
          {config.label}
        </div>
      </motion.div>
    </motion.div>
  )
}
```

---

## REDUCED MOTION — MANDATORY

```jsx
// Wrap ALL animations with this hook
import { useReducedMotion } from 'motion/react'

// In animated components:
const shouldReduceMotion = useReducedMotion()

// If true: slow down, don't stop
// Duration becomes 0.01s for transitions, 60s for loops
// Spring still fires but with high damping

const transition = shouldReduceMotion
  ? { duration: 0.01 }
  : springs.smooth
```

---

## PERFORMANCE RULES

```
✅  Only animate transform and opacity
✅  Use will-change: transform on elements that will animate on hover
✅  Remove will-change after animation completes (will-change: auto)
✅  Use once: true on whileInView to avoid re-triggering
✅  AnimatePresence mode="wait" for tab transitions (not "sync")
✅  Stagger max 6–8 items — beyond that, animate container only
❌  Never animate layout properties (width, height, top, left)
❌  Never use motion on text nodes directly — wrap in motion.div
❌  Never stagger more than 10 items (use virtual scroll instead)
```

---

## HOVER — TOUCH DEVICE RULE

```jsx
// Check for hover support before applying hover animations
// Indian Android users: hover states stick on touch

// In CSS:
// @media (hover: hover) { .card:hover { ... } }

// In Motion — use conditional:
const isHoverDevice = window.matchMedia('(hover: hover)').matches

<motion.div
  whileHover={isHoverDevice ? { y: -3 } : undefined}
  whileTap={{ scale: 0.98 }}
  transition={springs.response}
>
```
