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

export default Ring
