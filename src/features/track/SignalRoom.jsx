// src/features/track/SignalRoom.jsx
// National snapshot for the Track tab.

import { motion, useReducedMotion } from 'motion/react'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { CITY_STATE_LABELS, LPG_PRODUCT_TYPES } from '../../lib/utils'

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
      <Card variant="inset" className="card--spacious national-snapshot-card">
        <CardHeader
          kicker="National snapshot"
          title="Across India right now"
          titleAs="h3"
          actions={
            <span className="type-note text-[var(--text-muted)]">
              {formatSnapshotUpdated(pricesUpdatedAt)}
            </span>
          }
        >
          <p className="type-card-copy mt-3 mb-0 max-w-[42ch]">
            Daily tracked prices and recent shortage reporting, kept separate from your personal booking read.
          </p>
        </CardHeader>

        <CardBody className="pt-2">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="national-snapshot-hero">
              <div className="flex items-center gap-2">
                <StatusDot status="clear" size={7} />
                <span className="kicker text-[var(--accent)]">Lowest tracked 14.2kg refill today</span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="type-data-value type-data-value--hero">
                  {lowestTracked ? `₹${lowestTracked.price}` : '—'}
                </span>
                <span className="type-card-title text-[var(--text-secondary)]">
                  {lowestTracked
                    ? `${lowestTracked.city}${lowestTracked.state ? `, ${lowestTracked.state}` : ''}`
                    : 'Waiting for latest city prices'}
                </span>
              </div>

              <p className="type-note mt-3 mb-0 max-w-[42ch]">
                Based on the most recent tracked city prices in the current national scrape.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="national-snapshot-stat">
                <div className="flex items-center gap-2">
                  <StatusDot status={overallStatus} size={7} />
                  <span className="kicker">Active shortage clusters</span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="type-data-value">
                    {activeClusters}
                  </span>
                  <span className="type-note mb-1">
                    {activeClusters === 1 ? 'area under strain' : 'areas under strain'}
                  </span>
                </div>
              </div>

              <div className="national-snapshot-stat">
                <div className="flex items-center gap-2">
                  <StatusDot status={hotspotTone} size={7} />
                  <span className="kicker">Current hotspot</span>
                </div>
                <p className="type-card-title mt-3 mb-1">
                  {hotspot || 'No hotspot yet'}
                </p>
                <p className="type-note mb-0">
                  {hotspot
                    ? `${hotspotReports} report${hotspotReports === 1 ? '' : 's'} in the last 30 days.`
                    : 'No active shortage cluster is standing out right now.'}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

export default SignalRoom
