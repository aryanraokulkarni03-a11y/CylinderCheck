// src/components/shared/PriceTicker.jsx
// Scrolling LPG price strip -- motion marquee.
// Loops slowly under reduced motion (per motion rules).

import { motion, useReducedMotion } from 'motion/react'
import { COMPANIES } from '../../lib/utils'

const DOT = '\u00B7'
const RUPEE = '\u20B9'

export function PriceTicker({ mapPrices = {} }) {
  const prefersReduced = useReducedMotion()
  const duration = prefersReduced ? 60 : 24

  const items = Object.entries(mapPrices).flatMap(([city, comps]) => {
    const prices = COMPANIES.map(c => comps[c]?.price).filter(Boolean)
    if (!prices.length) return []
    const cheapest = Math.min(...prices)
    const color = cheapest < 880
      ? 'var(--status-clear)'
      : cheapest < 930
        ? 'var(--status-early)'
        : 'var(--status-active)'
    return [{ city, price: cheapest, color }]
  })

  if (!items.length) {
    return (
      <div className="card card--inset card--compact card-strip w-full h-10 flex items-center mb-6">
        <div className="h-3 w-full rounded bg-[var(--divider)] motion-safe:animate-pulse" />
      </div>
    )
  }

  // Double for seamless CSS infinite scroll
  const doubled = [...items, ...items]

  return (
    <div
      className="card card--inset card--compact card-strip w-full overflow-hidden mb-6 h-11 flex items-center relative select-none"
      aria-label="LPG prices ticker"
    >
      {/* Edge fade masks */}
      <div className="absolute left-0 top-0 w-8 h-full z-10
                      bg-gradient-to-r from-[var(--bg-inset)] to-transparent
                      pointer-events-none" />
      <div className="absolute right-0 top-0 w-8 h-full z-10
                      bg-gradient-to-l from-[var(--bg-inset)] to-transparent
                      pointer-events-none" />

      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
      >
        {doubled.map(({ city, price, color }, i) => (
          <span key={`${city}-${i}`}
            className="inline-flex items-center gap-2 mx-5">
            <span className="kicker kicker--caps">
              {city}
            </span>
            <span className="price text-[var(--fs-sm)]" style={{ color }}>
              {RUPEE}
              {price}
            </span>
            <span className="text-[var(--divider)]" aria-hidden="true">
              {DOT}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export default PriceTicker
