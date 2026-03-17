// src/features/track/UrgencyScore.jsx
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'motion/react'
import { springs, easing } from '../../lib/springs'

const scoreConfig = {
  low:     { color: 'var(--status-clear)',  label: "You're good",    bg: 'var(--k-forest)' },
  medium:  { color: 'var(--status-early)',  label: 'Plan ahead',     bg: 'var(--k-indigo)' },
  high:    { color: 'var(--status-active)', label: 'Book soon',      bg: 'var(--k-terracotta)' },
  critical:{ color: 'var(--status-severe)', label: 'Book right now', bg: 'var(--status-severe-glow)' },
}

function getConfig(score) {
  if (score <= 3) return scoreConfig.low
  if (score <= 6) return scoreConfig.medium
  if (score <= 8) return scoreConfig.high
  return scoreConfig.critical
}

export function UrgencyScore({ score }) {
  const config = getConfig(score)
  const shouldReduceMotion = useReducedMotion()
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

    if (shouldReduceMotion) {
      count.set(score)
      ringProgress.set(1)
      return
    }

    // Count up the number
    animate(count, score, { duration: 1.4, ease: easing.data })

    // Draw the ring simultaneously
    animate(ringProgress, 1, { duration: 1.4, ease: easing.data })
  }, [score, count, ringProgress, shouldReduceMotion])

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : springs.reveal}
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
          {/* Score number */}
          <motion.text
            x="60" y="55"
            textAnchor="middle"
            fill={config.color}
            fontSize="var(--fs-h2)"
            fontWeight="600"
            fontFamily="var(--font-display)"
          >
            {rounded}
          </motion.text>
          <text
            x="60" y="73"
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="var(--fs-xs)"
            letterSpacing="var(--ls-widest)"
            fontFamily="var(--font-body)"
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
        transition={shouldReduceMotion ? { duration: 0.01 } : { ...springs.arrival, delay: 0.8 }}
      >
        <div
          className="overline"
          style={{ color: config.color }}
        >
          {config.label}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default UrgencyScore
