// src/features/track/TrackTab.jsx
// Booking tracker + shortage intelligence by PIN.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MapPin } from 'lucide-react'
import { SectionMarker } from '../../components/shared/SectionMarker'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { UrgencyScore } from './UrgencyScore'
import { Ring } from '../../components/shared/Ring'
import { SignalRoom } from './SignalRoom'
import { PriceTicker } from '../../components/shared/PriceTicker'
import { SlideUp } from '../../components/motion/SlideUp'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { StatusDot } from '../../components/shared/StatusDot'
import { springs } from '../../lib/springs'
import { addDays, fmt } from '../../lib/utils'

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
    <div>
      <SectionMarker
        status={
          pinData?.reportCount >= 5
            ? 'severe'
            : pinData?.reportCount >= 2
              ? 'active'
              : 'clear'
        }
        label="Track Your Area"
      />

      <h1
        className="font-display font-extrabold text-[clamp(24px,4vw,36px)]
                   tracking-[-0.03em] text-[var(--text-primary)]
                   mb-2 leading-[1.1]"
      >
        Booking Tracker
      </h1>
      <p className="text-[var(--text-secondary)] text-[15px] mb-6 max-w-[560px]">
        Know when to book. Know if there is a shortage. Real-time delivery intelligence by PIN code.
      </p>

      <PriceTicker mapPrices={mapPrices} />

      <div className="grid md:grid-cols-[420px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <AnimatePresence>
            {!pinData && !loading && (
              <SignalRoom shortageSummary={shortageSummary} mapPrices={mapPrices} />
            )}
          </AnimatePresence>

          <div className="card">
            <div className="font-data text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] mb-4">
              Delivery Prediction
            </div>

            <div className="flex flex-col gap-2 mb-5">
              <label
                htmlFor="pin-input"
                className="font-data text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-bold"
              >
                Where are you?
              </label>
              <input
                id="pin-input"
                className="block w-full min-h-[52px] px-4 py-3
                           font-data text-[20px] tracking-[0.12em]
                           text-[var(--text-data)]
                           bg-[var(--bg-inset)] border border-[var(--border)]
                           rounded-md focus:border-[var(--accent)]
                           focus:outline-none transition-colors duration-150"
                placeholder="Enter 6-digit PIN"
                value={pin}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              />
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <label
                htmlFor="booking-date"
                className="font-data text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-bold"
              >
                Last Booking Date{' '}
                <span className="text-[var(--text-muted)] normal-case tracking-normal font-normal">
                  (optional)
                </span>
              </label>
              <input
                id="booking-date"
                type="date"
                className="block w-full min-h-[48px] px-4 py-3
                           font-body text-[15px] text-[var(--text-primary)]
                           bg-[var(--bg-inset)] border border-[var(--border)]
                           rounded-md focus:border-[var(--accent)]
                           focus:outline-none transition-colors duration-150"
                value={lastBooking}
                onChange={(e) => setLastBooking(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <p className="font-data text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-bold">
                Current Cylinder Level{' '}
                <span className="text-[var(--text-muted)] normal-case tracking-normal font-normal">
                  (optional, unlocks urgency score)
                </span>
              </p>
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
                    <span className="text-[16px] leading-none">{emoji}</span>
                    <span className="font-data text-[10px] font-bold uppercase tracking-[0.08em] leading-none">
                      {label}
                    </span>
                    <span className="font-data text-[9px] text-[var(--text-muted)] leading-none">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-[var(--status-severe)] mb-3">
                {error}
              </p>
            )}

            <LiquidGlassBtn onClick={handleTrack} disabled={loading} className="w-full justify-center">
              {loading ? 'Looking up...' : `See what's happening ${ARROW}`}
            </LiquidGlassBtn>
          </div>
        </div>

        <div ref={resultRef} className="scroll-mt-[calc(var(--topbar-height)+8px)]">
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
                    className="h-[14px] rounded bg-[var(--bg-inset)] animate-pulse mb-3"
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
                        <span className="font-data text-[11px] text-[var(--accent)] uppercase tracking-[0.10em]">
                          {pinData.area || `PIN ${pinData.pin}`}
                        </span>
                      </div>
                      <div className="font-display font-bold text-[24px] tracking-[-0.02em] text-[var(--text-primary)]">
                        {pinData.city}
                      </div>
                    </div>

                    {trend && (
                      <span
                        className={`font-data text-[10px] uppercase tracking-[0.10em]
                                    px-2 py-1 rounded-pill ${trend.className}`}
                      >
                        {trend.label}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-[var(--divider)]">
                    <div className="flex justify-between items-start py-3">
                      <span className="text-[13px] text-[var(--text-secondary)]">Avg Delivery</span>
                      <span className="text-right">
                        {avgDays != null ? (
                          <span className="inline-flex items-baseline justify-end gap-2">
                            <span className="font-data text-[14px] font-bold text-[var(--text-data)]">
                              {avgDays}
                            </span>
                            <span className="text-[12px] text-[var(--text-muted)]">days</span>
                          </span>
                        ) : (
                          <span className="text-[13px] text-[var(--text-muted)]">No data yet</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-start py-3">
                      <span className="text-[13px] text-[var(--text-secondary)]">Gas Agency</span>
                      <span className="text-[13px] text-[var(--text-secondary)] font-semibold text-right">
                        {pinData.agency}
                      </span>
                    </div>

                    {shortage && (
                      <div className="flex justify-between items-start py-3">
                        <span className="text-[13px] text-[var(--text-secondary)]">Shortage Status</span>
                        <span className="flex items-center justify-end gap-2">
                          <StatusDot status={shortage.status} size={7} />
                          <span className="font-data text-[12px] uppercase tracking-[0.08em] text-[var(--text-data)]">
                            {shortage.label}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {pinData.urgencyScore !== undefined && (
                  <div className="card mb-4 text-center">
                    <div className="font-data text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] mb-4">
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
                    <div className="font-data text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] mb-4">
                      Your Booking Window
                    </div>

                    <div className="flex items-center gap-5">
                      <Ring daysLeft={bookingResult.daysLeft} />
                      <div>
                        <p className="font-data text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">
                          {bookingResult.daysLeft <= 0 ? 'Window is open now' : 'Next window opens'}
                        </p>

                        {bookingResult.daysLeft <= 0 ? (
                          <p className="font-display font-bold text-[22px] tracking-[-0.02em] text-[var(--status-clear)]">
                            Book right now
                          </p>
                        ) : (
                          <p className="font-data font-bold text-[20px] tracking-[-0.01em] text-[var(--text-data)]">
                            {fmt(bookingResult.nextWindow)}
                          </p>
                        )}

                        {bookingResult.daysLeft > 0 && avgDays != null && (
                          <p className="font-data text-[11px] text-[var(--text-muted)] mt-2">
                            Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(avgDays)))}
                          </p>
                        )}

                        <KalamkariDivider />
                        <p className="font-data text-[10px] text-[var(--text-muted)]">
                          Based on{' '}
                          <span className="font-data text-[var(--text-data)]">25</span>-day rule
                          {avgDays != null ? (
                            <>
                              {' '}+ <span className="font-data text-[var(--text-data)]">{avgDays}</span>-day local delivery lag
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : springs.urgent}
                    className="flex items-start gap-3 p-4 rounded-lg border mb-4"
                    style={{
                      borderColor:
                        pinData.reportCount >= 5
                          ? 'var(--status-severe-border)'
                          : 'var(--status-active-border)',
                      background:
                        pinData.reportCount >= 5
                          ? 'var(--status-severe-soft)'
                          : 'var(--status-active-soft)',
                    }}
                  >
                    <StatusDot status={pinData.reportCount >= 5 ? 'severe' : 'active'} size={7} />
                    <div>
                      <div
                        className="font-data text-[12px] uppercase tracking-[0.10em] mb-1"
                        style={{
                          color: pinData.reportCount >= 5 ? 'var(--status-severe)' : 'var(--status-active)',
                        }}
                      >
                        {pinData.reportCount >= 5 ? 'Severe shortage in your area' : 'Active shortage in your area'}
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        Expect <span className="font-data text-[var(--text-data)]">3-7</span> extra days on delivery.
                        Book as early as your window allows.
                      </p>
                    </div>
                  </motion.div>
                )}

                {pinData.reportCount >= 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : { ...springs.arrival, delay: 0.4 }}
                    className="p-4 rounded-lg border border-[var(--accent-glow)] bg-[var(--accent-fog)]"
                  >
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">
                      Running a restaurant or hotel?
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                      Commercial gas cut across India. Find verified alternatives today.
                    </p>
                    <button
                      onClick={onCommercialClick}
                      className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-pop)]
                                 transition-colors duration-150"
                    >
                      Find alternatives now {' \u2192'}
                    </button>
                  </motion.div>
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
                    fontFamily="var(--font-data)"
                    fontSize="10"
                    fill="var(--text-muted)"
                    letterSpacing="1"
                  >
                    ?
                  </text>
                </svg>
                <p className="font-body text-[var(--text-muted)] text-[13px]">
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

