// src/features/track/SignalRoom.jsx
// The national live intelligence feed shown BEFORE user enters PIN
// This is the "control room of Indian LPG intelligence"

import { motion, useReducedMotion } from 'motion/react'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'

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
        <span className="font-data text-[11px] uppercase tracking-[0.14em]
                         text-[var(--text-muted)]">
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
            <div className="rounded-lg border border-[var(--border)]
                            bg-[var(--bg-raised)] p-4">
              <div className="font-data text-[22px] font-bold
                              text-[var(--text-data)] leading-none mb-1">
                {value}
              </div>
              <div className="font-data text-[10px] uppercase
                              tracking-[0.08em] text-[var(--text-muted)]">
                {label}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Hotspot alert if active */}
      {shortageSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
          className="flex items-start gap-3 p-4 rounded-lg
                     border border-[var(--status-active-glow)]"
          style={{ background: 'var(--status-active-soft)' }}
        >
          <StatusDot status="active" size={7} />
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.12em]
                            text-[var(--status-active)] mb-1">
              Hotspot | {shortageSummary.hotspot}
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">
              <span className="font-data text-[var(--text-data)]">
                {shortageSummary.hotspotReports}
              </span>
              {' '}reports in the last 30 days.{' '}
              <span className="font-data text-[11px]
                               text-[var(--status-active)] uppercase tracking-[0.08em]">
                {shortageSummary.activePinCount} PIN{shortageSummary.activePinCount > 1 ? 's' : ''} affected.
              </span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Instruction */}
      <p className="text-[13px] text-[var(--text-muted)] mt-4 text-center">
        Enter your PIN below for intelligence specific to your area
      </p>
    </motion.div>
  )
}

export default SignalRoom
