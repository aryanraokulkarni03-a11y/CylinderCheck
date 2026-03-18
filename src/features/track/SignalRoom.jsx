// src/features/track/SignalRoom.jsx
// The national live intelligence feed shown BEFORE user enters PIN
// This is the "control room of Indian LPG intelligence"

import { motion, useReducedMotion } from 'motion/react'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'
import { StatCard } from '../../components/ui/StatCard'
import { Callout } from '../../components/ui/Callout'

export function SignalRoom({ shortageSummary, mapPrices }) {
  const shouldReduceMotion = useReducedMotion()
  // Derive national stats
  const activeCities = shortageSummary?.activePinCount || 0
  const totalReports = shortageSummary?.totalReports || 0  // sourced from shortageSummary, not raw reports
  const cheapestPrice = Object.values(mapPrices).length > 0
    ? Math.min(...Object.values(mapPrices)
        .flatMap(c => Object.values(c).map(v => v.price))
        .filter(Boolean))
    : null

  const overallStatus = activeCities >= 5 ? 'severe'
    : activeCities >= 2 ? 'active'
    : activeCities >= 1 ? 'early'
    : 'clear'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
      className="mb-8"
    >
      {/* National status header */}
      <div className="flex items-center gap-3 mb-5">
        <StatusDot status={overallStatus} size={8} />
        <span className="overline text-[var(--text-muted)]">
          National LPG Intelligence | Live
        </span>
      </div>

      {/* Live stats */}
      <StaggerContainer staggerVal={0.14}
        className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            value: activeCities > 0 ? `${activeCities}` : '0',
            label: 'shortage zones',
            status: activeCities > 0 ? 'active' : 'clear',
          },
          {
            value: cheapestPrice ? `Rs ${cheapestPrice}` : '-',
            label: 'lowest price today',
            status: 'clear',
          },
          {
            value: totalReports > 0 ? `${totalReports}` : '0',
            label: 'community reports',
            status: totalReports > 10 ? 'early' : 'clear',
          },
        ].map(({ value, label, status }) => (
          <StaggerItem key={label}>
            <StatCard value={value} label={label} status={status} />
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Hotspot alert if active */}
      {shortageSummary && (
        <Callout
          as={motion.div}
          tone="active"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
          className="flex items-start gap-3"
        >
          <StatusDot status="active" size={7} />
          <div>
            <div className="overline text-[var(--status-active)] mb-1">
              Hotspot | {shortageSummary.hotspot}
            </div>
            <p className="text-[var(--fs-sm)] text-[var(--text-secondary)]">
              <span className="stat-value text-[var(--text-data)]">
                {shortageSummary.hotspotReports}
              </span>
              {' '}reports in the last 30 days.{' '}
              <span className="overline text-[var(--status-active)]">
                {shortageSummary.activePinCount} PIN{shortageSummary.activePinCount > 1 ? 's' : ''} affected.
              </span>
            </p>
          </div>
        </Callout>
      )}

      {/* Instruction */}
      <p className="text-[var(--fs-sm)] text-[var(--text-muted)] mt-4 text-center">
        Enter your PIN below for intelligence specific to your area
      </p>
    </motion.div>
  )
}

export default SignalRoom
