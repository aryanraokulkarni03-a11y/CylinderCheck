// src/components/shared/PriceTicker.jsx
// Scrolling LPG price strip -- motion marquee.
// Loops slowly under reduced motion (per motion rules).

import { motion, useReducedMotion } from 'motion/react'
import { LPG_PRODUCT_TYPES } from '../../lib/utils'
import { Card } from '../ui/Card'

const DOT = '\u00B7'
const RUPEE = '\u20B9'

export function PriceTicker({
  mapPrices = {},
  productType = LPG_PRODUCT_TYPES.domestic_14_2kg,
  ariaLabel = 'LPG prices ticker',
}) {
  const prefersReduced = useReducedMotion()
  const duration = prefersReduced ? 60 : 24

  const items = Object.entries(mapPrices).flatMap(([city, products]) => {
    const price = Number(products?.[productType]?.price)
    if (!Number.isFinite(price)) return []
    const color =
      productType === LPG_PRODUCT_TYPES.commercial_19kg
        ? price < 1800
          ? 'var(--status-clear)'
          : price < 2200
            ? 'var(--status-early)'
            : 'var(--status-active)'
        : price < 880
          ? 'var(--status-clear)'
          : price < 930
            ? 'var(--status-early)'
            : 'var(--status-active)'
    return [{ city, price, color }]
  })

  if (!items.length) {
    return (
      <Card variant="inset" size="compact" className="card-strip w-full h-10 flex items-center mb-6">
        <div className="h-3 w-full rounded bg-[var(--divider)] motion-safe:animate-pulse" />
      </Card>
    )
  }

  // Double for seamless CSS infinite scroll
  const doubled = [...items, ...items]

  return (
    <Card
      variant="inset"
      size="compact"
      className="card-strip w-full overflow-hidden mb-6 h-11 flex items-center relative select-none"
      aria-label={ariaLabel}
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
            <span className="kicker">
              {city}
            </span>
            <span className="type-table-value" style={{ color }}>
              {RUPEE}
              {price}
            </span>
            <span className="text-[var(--divider)]" aria-hidden="true">
              {DOT}
            </span>
          </span>
        ))}
      </motion.div>
    </Card>
  )
}

export default PriceTicker
