// src/lib/springs.js
// Centralized motion configurations for the "Deeplight" system.
// Absolute rule: Animate ONLY transform and opacity.

export const springs = {
  // Buttons, toggles, interactive controls (Fast response)
  response: {
    type: 'spring',
    stiffness: 420,
    damping: 28,
  },

  // Cards, panels, modals entering (Smooth arrival)
  smooth: {
    type: 'spring',
    stiffness: 280,
    damping: 28,
  },

  // Main content, page-level transitions (Unhurried)
  arrival: {
    type: 'spring',
    stiffness: 200,
    damping: 26,
    mass: 1,
  },

  // Data reveals — urgency score, stats (Slow start, builds momentum)
  reveal: {
    type: 'spring',
    stiffness: 160,
    damping: 22,
  },

  // Success states, all-clear moments (Slight bounce)
  delight: {
    type: 'spring',
    stiffness: 300,
    damping: 18,
  },

  // Shortage alerts, severe warnings (Precise, no bounce)
  urgent: {
    type: 'spring',
    stiffness: 380,
    damping: 32,
  },

  // Bottom sheets, modals (Physical upward push)
  sheet: {
    type: 'spring',
    stiffness: 320,
    damping: 28,
  },
};

export const timing = {
  instant:   0.08,   // press feedback
  fast:      0.15,   // hover states
  base:      0.22,   // standard transitions
  slow:      0.40,   // page-level
  cinematic: 0.90,   // entry sequences
};

export const easing = {
  out:    [0.4, 0, 0.2, 1],    // things appearing
  in:     [0.4, 0, 1, 1],      // things disappearing
  bounce: [0.34, 1.2, 0.64, 1], // delightful moments
  data:   [0.25, 0.1, 0.25, 1], // count-up animations
  float:  [0.16, 1, 0.3, 1],    // floating panels settling into place
};

export const staggerRules = {
  cards:   0.08,   // vendor cards, report cards
  stats:   0.14,   // stat numbers
  nav:     0.035,  // navigation items
  list:    0.06,   // list items
  chars:   0.03,   // character-by-character text
};

export const floatingAssistMotion = {
  passiveEntryDelayMs: 9000,
  passiveVisibleMs: 15000,
  panelEnter: { opacity: 0, y: 14, scale: 0.996 },
  panelActive: { opacity: 1, y: 0, scale: 1 },
  panelExit: { opacity: 0, y: 8, scale: 0.998 },
  panelTransition: {
    duration: 0.64,
    ease: easing.float,
  },
  collapsedEnter: { opacity: 0, y: 6, scale: 0.996 },
  collapsedActive: { opacity: 1, y: 0, scale: 1 },
  collapsedDormant: { opacity: 0.22, y: 4, scale: 0.992 },
  collapsedExit: { opacity: 0, y: 4, scale: 0.998 },
  collapsedTransition: {
    duration: 0.48,
    ease: easing.float,
  },
}
