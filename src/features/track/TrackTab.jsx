// src/features/track/TrackTab.jsx
// Booking tracker + shortage intelligence by PIN.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarRange, Clock3, MapPin, Target } from 'lucide-react'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { UrgencyScore } from './UrgencyScore'
import { Ring } from '../../components/shared/Ring'
import { SignalRoom } from './SignalRoom'
import { PriceTicker } from '../../components/shared/PriceTicker'
import { SlideUp } from '../../components/motion/SlideUp'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { StatusDot } from '../../components/shared/StatusDot'
import BookingDatePicker from './BookingDatePicker'
import { springs } from '../../lib/springs'
import { COMPANY_LABELS, addDays, fmt } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

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

function formatLastUpdated(value) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    const time = date.getTime()
    if (!Number.isFinite(time)) return ''

    const diff = Date.now() - time
    const mins = Math.max(0, Math.round(diff / 60000))
    if (mins < 60) return `Prices updated ${mins}m ago`

    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `Prices updated ${hrs}h ago`

    return `Prices updated ${date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return ''
  }
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
  pricesUpdatedAt,
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
        icon={Target}
        title="Booking Tracker"
        description="Know when to book. Know if there is a shortage. Real-time delivery intelligence by PIN code."
      />

      <PriceTicker mapPrices={mapPrices} />
      {pricesUpdatedAt ? (
        <div className="mb-6 mt-[-1rem] flex justify-end">
          <span className="type-note text-[var(--text-muted)]">
            {formatLastUpdated(pricesUpdatedAt)}
          </span>
        </div>
      ) : null}

      <div className="grid md:grid-cols-[420px_1fr] gap-6 items-start min-w-0">
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader
              kicker="Booking check"
              title="See when to book in your area"
              titleAs="h2"
            >
              <p className="type-card-copy mt-3 mb-0">
                Use your PIN to check delivery pace, shortage pressure, and the safest booking window for your area.
              </p>
            </CardHeader>

            <CardBody>
            <div className="mb-5">
              <Field id="pin-input" label="Your 6-digit PIN" required>
                <input
                  className="input type-data-input min-h-[52px]"
                  placeholder="Enter your area PIN"
                  value={pin}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                />
              </Field>
              {!pinData && !loading ? (
                <p className="type-note mt-3 mb-0 md:hidden">
                  We&apos;ll show local delivery delay, shortage pressure, and your next booking window.
                </p>
              ) : null}
            </div>

            <div className="mb-6">
              <Field id="booking-date" label="Last booking date" meta="Optional but useful">
                <BookingDatePicker
                  id="booking-date"
                  value={lastBooking}
                  onChange={setLastBooking}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <div className="field__top">
                <div className="field__label">Current cylinder level</div>
                <div className="field__meta">Optional for urgency read</div>
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
                    <span className="type-emoji-chip" aria-hidden="true">{emoji}</span>
                    <span className="kicker leading-none text-[inherit]">
                      {label}
                    </span>
                    <span className="type-note leading-none">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="type-note text-[var(--status-severe)] mb-3">
                {error}
              </p>
            )}

            <LiquidGlassBtn onClick={handleTrack} disabled={loading} className="w-full justify-center">
              {loading ? 'Looking up...' : `Check my area ${ARROW}`}
            </LiquidGlassBtn>
            </CardBody>
          </Card>
        </div>

        <div
          ref={resultRef}
          className="scroll-mt-[calc(var(--topbar-height)+8px)] min-w-0"
        >
          <AnimatePresence mode="wait">
            {loading && (
              <Card
                as={motion.div}
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                variant="inset"
                className="status-edge status-edge--early"
              >
                <div className="kicker mb-4">Reading local signal</div>
                {[55, 100, 80, 90].map((w, i) => (
                  <div
                    key={i}
                    className="h-[14px] rounded bg-[var(--bg-inset)] motion-safe:animate-pulse mb-3"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </Card>
            )}

            {pinData && !loading && (
              <SlideUp key="result">
                <Card className="mb-4">
                  <CardHeader
                    kicker={pinData.area || `PIN ${pinData.pin}`}
                    title={pinData.city}
                    titleAs="h2"
                    actions={
                      trend ? (
                        <span className={`badge ${trend.className}`}>
                          {trend.label}
                        </span>
                      ) : null
                    }
                  >
                    <div className="flex items-center gap-2 mt-3 text-[var(--accent)]">
                      <MapPin size={12} />
                      <span className="kicker text-[inherit]">Delivery intelligence</span>
                    </div>
                  </CardHeader>

                  <CardBody className="divide-y divide-[var(--divider)]">
                    <div className="flex justify-between items-start py-3">
                      <span className="type-meta">Avg Delivery</span>
                      <span className="text-right">
                        {avgDays != null ? (
                          <span className="inline-flex items-baseline justify-end gap-2">
                            <span className="type-data-value">
                              {avgDays}
                            </span>
                            <span className="type-data-label">days</span>
                          </span>
                        ) : (
                          <span className="type-note">No data yet</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-start py-3">
                      <span className="type-meta">Gas Agency</span>
                      <span className="type-card-copy--compact font-medium text-right">
                        {COMPANY_LABELS?.[pinData.agency] || pinData.agency}
                      </span>
                    </div>

                    {shortage && (
                      <div className="flex justify-between items-start py-3">
                        <span className="type-meta">Shortage Status</span>
                        <span className="flex items-center justify-end gap-2">
                          <StatusDot status={shortage.status} size={7} />
                          <span className="type-data-label text-[var(--text-data)]">
                            {shortage.label}
                          </span>
                        </span>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {pinData.urgencyScore !== undefined && (
                  <Card className="mb-4 text-center">
                    <CardHeader
                      kicker="Personal readout"
                      title="Urgency score"
                      titleAs="h2"
                    />
                    <CardBody>
                      <UrgencyScore score={pinData.urgencyScore} />
                    </CardBody>
                  </Card>
                )}

                {bookingResult && (
                  <Card
                    className={`mb-4 ${
                      bookingResult.daysLeft <= 0
                        ? 'border-[var(--status-clear-border)] bg-[var(--status-clear-soft)]'
                        : 'border-[var(--border)] bg-[var(--bg-raised)]'
                    }`}
                  >
                    <CardHeader
                      kicker="Booking window"
                      title={bookingResult.daysLeft <= 0 ? 'Window is open now' : 'Next booking window'}
                      titleAs="h2"
                    />

                    <div className="flex items-center gap-5">
                      <Ring daysLeft={bookingResult.daysLeft} />
                      <div>
                        {bookingResult.daysLeft <= 0 ? (
                          <p className="type-section-title text-[var(--status-clear)] mb-0">
                            Book right now
                          </p>
                        ) : (
                          <p className="type-data-value type-data-value--hero mb-0">
                            {fmt(bookingResult.nextWindow)}
                          </p>
                        )}

                        {bookingResult.daysLeft > 0 && avgDays != null && (
                          <p className="type-note mt-2 mb-0">
                            Est. delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(avgDays)))}
                          </p>
                        )}

                        <KalamkariDivider />
                        <p className="type-note mb-0">
                          Based on{' '}
                          <span className="type-data-value text-[inherit] text-[var(--text-data)]">25</span>-day rule
                          {avgDays != null ? (
                            <>
                              {' '}+ <span className="type-data-value text-[inherit] text-[var(--text-data)]">{avgDays}</span>-day local delivery lag
                            </>
                          ) : (
                            <> + local delivery lag</>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
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
                        className="kicker mb-1"
                        style={{
                          color: pinData.reportCount >= 5 ? 'var(--status-severe)' : 'var(--status-active)',
                        }}
                      >
                        {pinData.reportCount >= 5 ? 'Severe shortage in your area' : 'Active shortage in your area'}
                      </div>
                      <p className="type-card-copy mb-0">
                        Expect <span className="type-data-value text-[inherit] text-[var(--text-data)]">3-7</span> extra days on delivery.
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
                    <p className="type-card-title mb-1">
                      Running a restaurant or hotel?
                    </p>
                    <p className="type-note mb-3">
                      Commercial gas cut across India. Find verified alternatives today.
                    </p>
                    <button
                      onClick={onCommercialClick}
                      className="type-nav text-[var(--accent)] hover:text-[var(--accent-pop)]
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
                className="hidden md:block"
              >
                <Card
                  variant="inset"
                  className="card--spacious min-h-[300px] w-full border-[var(--border)]"
                >
                  <CardHeader
                    kicker="For your area"
                    title="What unlocks when you check your PIN"
                    titleAs="h3"
                  >
                    <p className="type-card-copy mt-3 mb-0 max-w-[38ch]">
                      You&apos;ll get a clearer read on delivery pace, local shortage pressure, and whether it&apos;s time to book now or wait.
                    </p>
                  </CardHeader>

                  <CardBody className="pt-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        {
                          icon: Clock3,
                          eyebrow: 'Delivery pace',
                          title: 'How long cylinders are taking nearby',
                          note: 'See the local average wait before a refill reaches homes around your PIN.',
                        },
                        {
                          icon: MapPin,
                          eyebrow: 'Shortage watch',
                          title: 'Whether your area is under strain',
                          note: 'Spot active delivery pressure before it turns into a late refill or stock stress.',
                        },
                        {
                          icon: CalendarRange,
                          eyebrow: 'Booking cue',
                          title: 'When your next booking window opens',
                          note: 'Use your last booking date to judge whether to book now, hold, or plan ahead.',
                        },
                      ].map(({ icon: Icon, eyebrow, title, note }, index) => (
                        <div
                          key={title}
                          className={`rounded-[22px] border border-[var(--divider)] bg-[var(--bg-raised)] px-4 py-4 ${
                            index === 2 ? 'md:col-span-2' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--bg-inset))] text-[var(--accent)] shadow-[0_12px_30px_rgba(241,139,31,0.12)]">
                              <Icon size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="kicker mb-2 text-[var(--accent)]">{eyebrow}</p>
                              <p className="type-card-title mb-1">{title}</p>
                              <p className="type-note mb-0 max-w-[40ch]">{note}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[22px] border border-[var(--divider)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_6%,var(--bg-raised))_0%,var(--bg-raised)_100%)] px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-inset)] text-[var(--accent)]">
                          <Target size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="type-card-title mb-1">Better read with the optional details</p>
                          <p className="type-note mb-0">
                            Add your last booking date and current cylinder level for a more useful urgency read, especially when local deliveries are slowing down.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <SignalRoom
            shortageSummary={shortageSummary}
            mapPrices={mapPrices}
            pricesUpdatedAt={pricesUpdatedAt}
          />
        </div>
      </div>
    </div>
  )
}

export default TrackTab
