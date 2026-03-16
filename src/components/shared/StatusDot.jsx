// src/components/shared/StatusDot.jsx
import { motion, useReducedMotion } from 'motion/react'

const STATUS_CONFIG = {
  clear:  { color: 'var(--status-clear)',  glow: 'var(--status-clear-glow)',  duration: 2.8 },
  early:  { color: 'var(--status-early)',  glow: 'var(--status-early-glow)',  duration: 2.2 },
  active: { color: 'var(--status-active)', glow: 'var(--status-active-glow)', duration: 1.6 },
  severe: { color: 'var(--status-severe)', glow: 'var(--status-severe-glow)', duration: 0.9 },
}

export function StatusDot({ status = 'clear', size = 8 }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.clear
  const prefersReduced = useReducedMotion()
  const dur = prefersReduced ? 60 : cfg.duration

  return (
    <span className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      {/* Outer pulse ring */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: cfg.color }}
        animate={{ scale: [1, 2.4, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      {/* Inner pulse ring */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: cfg.color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Core dot */}
      <span
        className="relative rounded-full w-full h-full z-10"
        style={{
          background: cfg.color,
          boxShadow: `0 0 ${size * 1.5}px ${cfg.glow}`,
        }}
      />
    </span>
  )
}

export default StatusDot
