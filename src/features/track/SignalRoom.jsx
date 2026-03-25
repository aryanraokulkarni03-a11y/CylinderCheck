// src/features/track/SignalRoom.jsx
// National snapshot for the Track tab.

import { motion, useReducedMotion } from 'motion/react'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { CITY_STATE_LABELS, LPG_PRODUCT_TYPES } from '../../lib/utils'

const RUPEE = '\u20B9'

function formatSnapshotUpdated(value) {
  if (!value) return 'Waiting for latest sync'

  try {
    const date = new Date(value)
    const diff = Date.now() - date.getTime()
    const mins = Math.max(0, Math.round(diff / 60000))
    if (mins < 60) return `Updated ${mins}m ago`

    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `Updated ${hrs}h ago`

    return `Updated ${date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return 'Waiting for latest sync'
  }
}

export function SignalRoom({ shortageSummary, mapPrices, pricesUpdatedAt }) {
  const shouldReduceMotion = useReducedMotion()

  const nationalPriceRows = Object.entries(mapPrices || {}).flatMap(([city, comps]) =>
    (() => {
      const price = Number(comps?.[LPG_PRODUCT_TYPES.domestic_14_2kg]?.price)
      if (!Number.isFinite(price)) return []
      return [{
        city,
        state: CITY_STATE_LABELS[city] || '',
        price,
      }]
    })(),
  )

  const lowestTracked = nationalPriceRows.length
    ? nationalPriceRows.reduce((best, current) => (current.price < best.price ? current : best))
    : null

  const activeClusters = shortageSummary?.activePinCount || 0
  const hotspot = shortageSummary?.hotspot || ''
  const hotspotReports = shortageSummary?.hotspotReports || 0
  const overallStatus =
    activeClusters >= 5 ? 'severe' :
      activeClusters >= 2 ? 'active' :
        activeClusters >= 1 ? 'early' : 'clear'
  const hotspotTone =
    hotspotReports >= 5 ? 'severe' :
      hotspotReports >= 2 ? 'active' :
        hotspotReports >= 1 ? 'early' : 'clear'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
      className="mt-4"
    >
      <Card variant="inset" className="card--utility-tight national-snapshot-card">
        <CardHeader
          title="Domestic LPG across India"
          titleAs="h2"
          actions={(
            <span className="type-note text-[var(--text-muted)]">
              {formatSnapshotUpdated(pricesUpdatedAt)}
            </span>
          )}
        >
          <p className="type-card-copy mt-1 mb-0 max-w-[42ch]">
            Current city prices and recent shortage reporting, kept separate from your local result.
          </p>
        </CardHeader>

        <CardBody className="pt-1">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="national-snapshot-hero flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <StatusDot status="clear" size={7} />
                <span className="kicker text-[var(--accent)]">Lowest tracked 14.2kg refill</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="type-data-value type-data-value--hero leading-none">
                  {lowestTracked ? `${RUPEE}${lowestTracked.price}` : '\u2014'}
                </span>
                <span className="type-card-title text-[var(--text-secondary)]">
                  {lowestTracked
                    ? `${lowestTracked.city}${lowestTracked.state ? `, ${lowestTracked.state}` : ''}`
                    : 'Waiting for latest city prices'}
                </span>
              </div>

              <p className="type-note mt-3 mb-0 max-w-[42ch]">
                Based on the latest trusted city prices.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="national-snapshot-stat">
                <div className="flex items-center gap-2 mb-4">
                  <StatusDot status={overallStatus} size={7} />
                  <span className="kicker">Areas under pressure</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="type-data-value type-data-value--hero leading-none">
                    {activeClusters}
                  </span>
                  <span className="type-card-title text-[var(--text-secondary)]">
                    {activeClusters === 1 ? 'area under strain' : 'areas under strain'}
                  </span>
                </div>
              </div>

              <div className="national-snapshot-stat">
                <div className="flex items-center gap-2 mb-4">
                  <StatusDot status={hotspotTone} size={7} />
                  <span className="kicker">Most reported city</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="type-data-value type-data-value--hero leading-none truncate">
                    {hotspot || 'No hotspot yet'}
                  </span>
                  <span className="type-note text-[var(--text-muted)]">
                    {hotspot
                      ? `${hotspotReports} report${hotspotReports === 1 ? '' : 's'} in the last 30 days.`
                      : 'No active shortage cluster is standing out right now.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

export default SignalRoom
