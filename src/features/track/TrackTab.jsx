// src/features/track/TrackTab.jsx
// Booking tracker + shortage intelligence by PIN.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MapPin } from 'lucide-react'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { UrgencyScore } from './UrgencyScore'
import { Ring } from '../../components/shared/Ring'
import { SignalRoom } from './SignalRoom'
import { PriceTicker } from '../../components/shared/PriceTicker'
import { SlideUp } from '../../components/motion/SlideUp'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'
import { COMPANY_LABELS, addDays, fmt } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'

const ARROW = '\u2192'

const CYLINDER_LEVELS = [
  { value: 'full', label: 'Full', emoji: '\u{1F7E2}', hint: '> 75%' }, // green circle
  { value: 'half', label: 'Half', emoji: '\u{1F7E1}', hint: '~50%' }, // yellow circle
  { value: 'low', label: 'Low', emoji: '\u{1F7E0}', hint: '< 25%' }, // orange circle
  { value: 'critical', label: 'Critical', emoji: '\u{1F534}', hint: 'Empty' }, // red circle
]

function trendPill(trend) {
  if (trend === 'improving') {
    return {
      label: 'Improving',
      className:
        'text-[var(--status-clear)] bg-[var(--status-clear-soft)] border border-[var(--status-clear-border)]',
    }
  }
  if (trend === 'worsening') {
    return {
      label: 'Worsening',
      className:
        'text-[var(--status-active)] bg-[var(--status-active-soft)] border border-[var(--status-active-border)]',
    }
  }
  return {
    label: 'Stable',
    className:
      'text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]',
  }
}

function shortageMeta(reportCount) {
  if (reportCount <= 0) return { status: 'clear', label: 'All clear' }
  if (reportCount === 1) return { status: 'early', label: 'Early signal (1 report)' }
  if (reportCount <= 4) return { status: 'active', label: `Active shortage (${reportCount} reports)` }
  return { status: 'severe', label: `Severe shortage (${reportCount} reports)` }
}

export function TrackTab({
  pin,
  setPin,
  lastBooking,
  setLastBooking,
  pinData,
  bookingResult,
  loading,
  error,
  cylinderLevel,
  setCylinderLevel,
  handleTrack,
  resultRef,
  shortageSummary,
  mapPrices,
  onCommercialClick,
}) {
  const shouldReduceMotion = useReducedMotion()

  const avgDays =
    typeof pinData?.avg_days === 'number'
      ? pinData.avg_days
      : null
  const trend = pinData?.trend ? trendPill(pinData.trend) : null
  const shortage = pinData ? shortageMeta(pinData.reportCount || 0) : null

  return (
    <div className="w-full min-w-0">
      <PageHeader
        markerStatus={
          pinData?.reportCount >= 5
            ? 'severe'
            : pinData?.reportCount >= 2
              ? 'active'
              : 'clear'
        }
        markerLabel="Track Your Area"
        title="Booking Tracker"
        description="Know when to book. Know if there is a shortage. Real-time delivery intelligence by PIN code."
      />

      <PriceTicker mapPrices={mapPrices} />

      <div className="grid md:grid-cols-[420px_1fr] gap-6 items-start min-w-0">
        <div className="space-y-4 min-w-0">
          <AnimatePresence>
            {!pinData && !loading && (
              <SignalRoom shortageSummary={shortageSummary} mapPrices={mapPrices} />
            )}
          </AnimatePresence>

          <div className="card">
            <div className="overline text-[var(--accent)] mb-4">
              Delivery Prediction
            </div>

            <div className="mb-5">
              <Field id="pin-input" label="Where are you?" required>
                <input
                  className="input min-h-[52px] tracking-[0.12em] text-[var(--text-data)]"
                  placeholder="Enter 6-digit PIN"
                  value={pin}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                />
              </Field>
            </div>

            <div className="mb-6">
              <Field id="booking-date" label="Last booking date" meta="Optional">
                <input
                  type="date"
                  className="input"
                  value={lastBooking}
                  onChange={(e) => setLastBooking(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <div className="field__top">
                <div className="field__label">Current cylinder level</div>
                <div className="field__meta">Optional (unlocks urgency score)</div>
              </div>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Current cylinder level">
                {CYLINDER_LEVELS.map(({ value, label, emoji, hint }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={cylinderLevel === value}
                    onClick={() => setCylinderLevel((prev) => (prev === value ? null : value))}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-md
                                border text-center transition-colors
                                ${
                                  cylinderLevel === value
                                    ? value === 'critical'
                                      ? 'bg-[var(--status-severe-soft)] border-[var(--status-severe)] text-[var(--status-severe)]'
                                      : value === 'low'
                                        ? 'bg-[var(--status-active-soft)] border-[var(--status-active)] text-[var(--status-active)]'
                                        : value === 'half'
                                          ? 'bg-[var(--status-early-soft)] border-[var(--status-early)] text-[var(--status-early)]'
                                          : 'bg-[var(--status-clear-soft)] border-[var(--status-clear)] text-[var(--status-clear)]'
                                    : 'bg-[var(--bg-inset)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                                }`}
                  >
                    <span className="text-[var(--fs-body)] leading-none">{emoji}</span>
                    <span className="overline leading-none">
                      {label}
                    </span>
                    <span className="caption text-[var(--text-muted)] leading-none">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-[var(--fs-xs)] text-[var(--status-severe)] mb-3">
                {error}
              </p>
            )}

            <LiquidGlassBtn onClick={handleTrack} disabled={loading} className="w-full justify-center">
              {loading ? 'Looking up...' : `See what's happening ${ARROW}`}
            </LiquidGlassBtn>
          </div>
        </div>

        <div
          ref={resultRef}
          className="scroll-mt-[calc(var(--topbar-height)+8px)] min-w-0"
        >
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                className="card"
              >
                {[55, 100, 80, 90].map((w, i) => (
                  <div
                    key={i}
                    className="h-[14px] rounded bg-[var(--bg-inset)] motion-safe:animate-pulse mb-3"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </motion.div>
            )}

            {pinData && !loading && (
              <SlideUp key="result">
                <div className="card mb-4">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={12} style={{ color: 'var(--accent)' }} />
                        <span className="overline text-[var(--accent)]">
                          {pinData.area || `PIN ${pinData.pin}`}
                        </span>
                      </div>
                      <h2 className="text-[var(--text-primary)] m-0">
                        {pinData.city}
                      </h2>
                    </div>

                    {trend && (
                      <span
                        className={`badge ${trend.className}`}
                      >
                        {trend.label}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-[var(--divider)]">
                    <div className="flex justify-between items-start py-3">
                      <span className="text-[var(--fs-sm)] text-[var(--text-secondary)]">Avg Delivery</span>
                      <span className="text-right">
                        {avgDays != null ? (
                          <span className="inline-flex items-baseline justify-end gap-2">
                            <span className="stat-value text-[var(--fs-body)] text-[var(--text-data)]">
                              {avgDays}
                            </span>
                            <span className="label-text text-[var(--text-muted)]">days</span>
                          </span>
                        ) : (
                          <span className="text-[var(--fs-sm)] text-[var(--text-muted)]">No data yet</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-start py-3">
                      <span className="text-[var(--fs-sm)] text-[var(--text-secondary)]">Gas Agency</span>
                      <span className="text-[var(--fs-sm)] text-[var(--text-secondary)] font-medium text-right">
                        {COMPANY_LABELS?.[pinData.agency] || pinData.agency}
                      </span>
                    </div>

                    {shortage && (
                      <div className="flex justify-between items-start py-3">
                        <span className="text-[var(--fs-sm)] text-[var(--text-secondary)]">Shortage Status</span>
                        <span className="flex items-center justify-end gap-2">
                          <StatusDot status={shortage.status} size={7} />
                          <span className="label-text text-[var(--text-data)]">
                            {shortage.label}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {pinData.urgencyScore !== undefined && (
                  <div className="card mb-4 text-center">
                    <div className="overline text-[var(--accent)] mb-4">
                      Urgency Score
                    </div>
                    <UrgencyScore score={pinData.urgencyScore} />
                  </div>
                )}

                {bookingResult && (
                  <div
                    className={`rounded-[var(--radius-lg)] border p-6 mb-4 ${
                      bookingResult.daysLeft <= 0
                        ? 'border-[var(--status-clear-border)] bg-[var(--status-clear-soft)]'
                        : 'border-[var(--border)] bg-[var(--bg-raised)]'
                    }`}
                  >
                    <div className="overline text-[var(--accent)] mb-4">
                      Your Booking Window
                    </div>

                    <div className="flex items-center gap-5">
                      <Ring daysLeft={bookingResult.daysLeft} />
                      <div>
                        <p className="overline text-[var(--text-muted)] mb-1">
                          {bookingResult.daysLeft <= 0 ? 'Window is open now' : 'Next window opens'}
                        </p>

                        {bookingResult.daysLeft <= 0 ? (
                          <p className="font-display font-bold text-[var(--fs-h4)] tracking-[-0.02em] text-[var(--status-clear)]">
                            Book right now
                          </p>
                        ) : (
                          <p className="stat text-[var(--fs-h4)] text-[var(--text-data)]">
                            {fmt(bookingResult.nextWindow)}
                          </p>
                        )}

                        {bookingResult.daysLeft > 0 && avgDays != null && (
                          <p className="caption text-[var(--text-muted)] mt-2">
                            Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(avgDays)))}
                          </p>
                        )}

                        <KalamkariDivider />
                        <p className="caption text-[var(--text-muted)]">
                          Based on{' '}
                          <span className="stat-value text-[var(--text-data)]">25</span>-day rule
                          {avgDays != null ? (
                            <>
                              {' '}+ <span className="stat-value text-[var(--text-data)]">{avgDays}</span>-day local delivery lag
                            </>
                          ) : (
                            <> + local delivery lag</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {pinData.reportCount >= 2 && (
                  <Callout
                    as={motion.div}
                    tone={pinData.reportCount >= 5 ? 'severe' : 'active'}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : springs.urgent}
                    className="flex items-start gap-3 mb-4"
                  >
                    <StatusDot status={pinData.reportCount >= 5 ? 'severe' : 'active'} size={7} />
                    <div>
                      <div
                        className="overline mb-1"
                        style={{
                          color: pinData.reportCount >= 5 ? 'var(--status-severe)' : 'var(--status-active)',
                        }}
                      >
                        {pinData.reportCount >= 5 ? 'Severe shortage in your area' : 'Active shortage in your area'}
                      </div>
                      <p className="text-[var(--fs-sm)] text-[var(--text-secondary)]">
                        Expect <span className="stat-value text-[var(--text-data)]">3-7</span> extra days on delivery.
                        Book as early as your window allows.
                      </p>
                    </div>
                  </Callout>
                )}

                {pinData.reportCount >= 2 && (
                  <Callout
                    as={motion.div}
                    tone="accent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : { ...springs.arrival, delay: 0.4 }}
                    className="mb-4"
                    edge={false}
                  >
                    <p className="text-[var(--fs-sm)] font-medium text-[var(--text-primary)] mb-1">
                      Running a restaurant or hotel?
                    </p>
                    <p className="text-[var(--fs-xs)] text-[var(--text-secondary)] mb-3">
                      Commercial gas cut across India. Find verified alternatives today.
                    </p>
                    <button
                      onClick={onCommercialClick}
                      className="text-[var(--fs-xs)] font-medium text-[var(--accent)] hover:text-[var(--accent-pop)]
                                 transition-colors duration-150"
                    >
                      Find alternatives now {' \u2192'}
                    </button>
                  </Callout>
                )}
              </SlideUp>
            )}

            {!pinData && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                className="hidden md:flex flex-col items-center justify-center py-12 text-center"
              >
                <svg width="64" height="80" viewBox="0 0 64 80" fill="none" className="mb-4 opacity-30">
                  <ellipse cx="32" cy="12" rx="24" ry="8" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                  <line x1="8" y1="12" x2="8" y2="62" stroke="var(--accent)" strokeWidth="1.5" />
                  <line x1="56" y1="12" x2="56" y2="62" stroke="var(--accent)" strokeWidth="1.5" />
                  <ellipse cx="32" cy="62" rx="24" ry="8" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                  <ellipse cx="32" cy="62" rx="24" ry="8" fill="var(--accent)" opacity="0.15" />
                  <circle cx="32" cy="10" r="3" fill="var(--accent)" opacity="0.6" />
                  <text
                    x="32"
                    y="40"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize="var(--fs-xs)"
                    fill="var(--text-muted)"
                    letterSpacing="var(--ls-widest)"
                  >
                    ?
                  </text>
                </svg>
                <p className="font-body text-[var(--text-muted)] text-[var(--fs-sm)]">
                  Enter your PIN for live intelligence
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default TrackTab
