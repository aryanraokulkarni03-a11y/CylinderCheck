// src/features/track/TrackTab.jsx
// Booking tracker + shortage pressure by PIN.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarRange, Clock3, MapPin, Target, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { addDays, fmt } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import { supabase } from '../../supabaseClient'

const ARROW = '\u2192'
const SIGNAL_PANEL_DISMISS_MS = 24 * 60 * 60 * 1000
const SIGNAL_SUBMISSION_COOLDOWN_MS = 12 * 60 * 60 * 1000

const CYLINDER_LEVELS = [
  { value: 'full', label: 'Full', emoji: '\u{1F7E2}', hint: '> 75%' }, // green circle
  { value: 'half', label: 'Half', emoji: '\u{1F7E1}', hint: '~50%' }, // yellow circle
  { value: 'low', label: 'Low', emoji: '\u{1F7E0}', hint: '< 25%' }, // orange circle
  { value: 'critical', label: 'Critical', emoji: '\u{1F534}', hint: 'Empty' }, // red circle
]

function pressurePill(supplyPressure) {
  if (!supplyPressure) {
    return {
      label: 'Limited evidence',
      className:
        'text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]',
    }
  }
  if (supplyPressure.status === 'clear') {
    return {
      label: supplyPressure.badgeLabel,
      className:
        'text-[var(--status-clear)] bg-[var(--status-clear-soft)] border border-[var(--status-clear-border)]',
    }
  }
  if (supplyPressure.status === 'active') {
    return {
      label: supplyPressure.badgeLabel,
      className:
        'text-[var(--status-active)] bg-[var(--status-active-soft)] border border-[var(--status-active-border)]',
    }
  }
  if (supplyPressure.status === 'severe') {
    return {
      label: supplyPressure.badgeLabel,
      className:
        'text-[var(--status-severe)] bg-[var(--status-severe-soft)] border border-[var(--status-severe-border)]',
    }
  }
  return {
    label: supplyPressure.badgeLabel,
    className:
      'text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]',
  }
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
  user,
  authLoading,
  onGoogleSignIn,
  onCommercialClick,
}) {
  const shouldReduceMotion = useReducedMotion()
  const [signalDeliveryDays, setSignalDeliveryDays] = useState('')
  const [signalPressureLevel, setSignalPressureLevel] = useState(null)
  const [signalNote, setSignalNote] = useState('')
  const [signalSubmitting, setSignalSubmitting] = useState(false)
  const [signalState, setSignalState] = useState({ ok: '', error: '' })
  const [signalPanelOpen, setSignalPanelOpen] = useState(false)
  const [signalPanelInteracted, setSignalPanelInteracted] = useState(false)
  const skipNextPanelAutoOpenRef = useRef(false)

  const deliveryEstimate = pinData?.deliveryEstimate || null
  const supplyPressure = pinData?.supplyPressure || null
  const pressure = pressurePill(supplyPressure)
  const hasSignalDraft =
    !!signalDeliveryDays || !!signalPressureLevel || signalNote.trim().length > 0
  const signalDismissKey = pinData?.pin ? `cc-track-signal-dismissed:${pinData.pin}` : ''

  const canSubmitSignal =
    !!user &&
    !!pinData?.pin &&
    (
      (signalDeliveryDays && Number(signalDeliveryDays) >= 1 && Number(signalDeliveryDays) <= 30) ||
      !!signalPressureLevel
    )

  const wasSignalPanelDismissedRecently = (dismissKey) => {
    if (!dismissKey || typeof window === 'undefined') return false

    try {
      const rawValue = window.localStorage.getItem(dismissKey)
      if (!rawValue) return false

      const parsed = JSON.parse(rawValue)
      const dismissedAt = Number(parsed?.dismissedAt)
      if (!Number.isFinite(dismissedAt)) return false

      if (Date.now() - dismissedAt > SIGNAL_PANEL_DISMISS_MS) {
        window.localStorage.removeItem(dismissKey)
        return false
      }

      return true
    } catch {
      return false
    }
  }

  const rememberSignalPanelDismiss = (dismissKey) => {
    if (!dismissKey || typeof window === 'undefined') return

    try {
      window.localStorage.setItem(
        dismissKey,
        JSON.stringify({ dismissedAt: Date.now() }),
      )
    } catch {
      // Ignore storage issues.
    }
  }

  const clearSignalPanelDismiss = (dismissKey) => {
    if (!dismissKey || typeof window === 'undefined') return

    try {
      window.localStorage.removeItem(dismissKey)
    } catch {
      // Ignore storage issues.
    }
  }

  useEffect(() => {
    if (!pinData?.pin) return

    if (skipNextPanelAutoOpenRef.current) {
      skipNextPanelAutoOpenRef.current = false
      setSignalPanelOpen(false)
      setSignalPanelInteracted(false)
      return
    }

    setSignalPanelOpen(!wasSignalPanelDismissedRecently(signalDismissKey))
    setSignalPanelInteracted(false)
  }, [pinData?.pin, signalDismissKey])

  useEffect(() => {
    if (!pinData?.pin || !signalPanelOpen || signalPanelInteracted) return undefined

    const timeoutId = window.setTimeout(() => {
      setSignalPanelOpen(false)
    }, 10000)

    return () => window.clearTimeout(timeoutId)
  }, [pinData?.pin, signalPanelOpen, signalPanelInteracted])

  const markSignalInteraction = () => {
    if (!signalPanelInteracted) setSignalPanelInteracted(true)
  }

  const handleSignalSubmit = async () => {
    if (!user || !pinData?.pin) return

    const deliveryDays = signalDeliveryDays ? Number.parseInt(signalDeliveryDays, 10) : null
    if (signalDeliveryDays && (!Number.isFinite(deliveryDays) || deliveryDays < 1 || deliveryDays > 30)) {
      setSignalState({ ok: '', error: 'Enter delivery days between 1 and 30.' })
      return
    }
    if (!deliveryDays && !signalPressureLevel) {
      setSignalState({ ok: '', error: 'Add delivery days, supply pressure, or both.' })
      return
    }

    setSignalSubmitting(true)
    setSignalState({ ok: '', error: '' })

    const cooldownSince = new Date(Date.now() - SIGNAL_SUBMISSION_COOLDOWN_MS).toISOString()
    const { data: recentOwnSignal, error: recentOwnSignalError } = await supabase
      .from('pin_user_signals')
      .select('created_at')
      .eq('pin', pinData.pin)
      .eq('user_id', user.id)
      .gte('created_at', cooldownSince)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!recentOwnSignalError && recentOwnSignal?.length) {
      setSignalSubmitting(false)
      setSignalState({
        ok: '',
        error: 'You already added a local signal for this PIN recently. Try again later if conditions change.',
      })
      return
    }

    const { error: insertError } = await supabase
      .from('pin_user_signals')
      .insert([
        {
          pin: pinData.pin,
          city: pinData.city?.split(',')[0]?.trim() || null,
          state: pinData.city?.split(',')[1]?.trim() || null,
          area: pinData.area || null,
          user_id: user.id,
          user_email: user.email,
          delivery_days: deliveryDays,
          pressure_level: signalPressureLevel,
          note: signalNote.trim() || null,
        },
      ])

    setSignalSubmitting(false)

    if (insertError) {
      const cooldownBlocked =
        typeof insertError.message === 'string' &&
        insertError.message.toLowerCase().includes('track_signal_cooldown')

      setSignalState({
        ok: '',
        error: cooldownBlocked
          ? 'You already added a local signal for this PIN recently. Try again later if conditions change.'
          : 'Could not save your verified signal right now.',
      })
      return
    }

    setSignalDeliveryDays('')
    setSignalPressureLevel(null)
    setSignalNote('')
    setSignalState({ ok: 'Verified signal saved for this PIN.', error: '' })
    skipNextPanelAutoOpenRef.current = true
    clearSignalPanelDismiss(signalDismissKey)
    setSignalPanelOpen(false)
    setSignalPanelInteracted(false)
    await handleTrack()
  }

  return (
    <div className="page-root">
      <PageHeader
        icon={Target}
        title="Booking Tracker"
        description="Check delivery estimates, booking date, and local supply pressure in your area with your PIN."
      />

      <div className="page-section page-section--tight">
        <PriceTicker mapPrices={mapPrices} className="!mb-0" />
        {pricesUpdatedAt ? (
          <div className="page-note-row">
            <span className="type-note text-[var(--text-muted)]">
              {formatLastUpdated(pricesUpdatedAt)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="page-grid-form-feed">
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader
              kicker="Local check"
              title="Check your area before you book"
              titleAs="h2"
            >
              <p className="type-card-copy mt-3 mb-0">
                Use your PIN to see a local delivery estimate, supply pressure signal, and the next sensible booking date.
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
                  We&apos;ll show delivery estimates, supply pressure, and your next booking date.
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
                <div className="field__meta">Optional for a sharper read</div>
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
              {loading ? 'Checking...' : `Check your area ${ARROW}`}
            </LiquidGlassBtn>
            </CardBody>
          </Card>
        </div>

        <div
          ref={resultRef}
          className="page-scroll-anchor min-w-0"
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
                <div className="kicker mb-4">Checking your area</div>
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
                      pressure ? (
                        <span className={`badge ${pressure.className}`}>
                          {pressure.label}
                        </span>
                      ) : null
                    }
                  >
                    <div className="flex items-center gap-2 mt-3 text-[var(--accent)]">
                      <MapPin size={12} />
                      <span className="kicker text-[inherit]">Local planning signal</span>
                    </div>
                  </CardHeader>

                  <CardBody className="divide-y divide-[var(--divider)]">
                    <div className="track-signal-row">
                      <div className="track-signal-row__copy">
                        <span className="type-meta">Delivery estimate</span>
                        <p className="type-note mt-2 mb-0">
                          {deliveryEstimate?.note}
                        </p>
                      </div>
                      <span className="track-signal-row__value">
                        <span className="track-signal-row__summary">
                          {deliveryEstimate?.summary}
                        </span>
                      </span>
                    </div>

                    {supplyPressure && (
                      <div className="track-signal-row">
                        <div className="track-signal-row__copy">
                          <span className="type-meta">Supply pressure</span>
                          <p className="type-note mt-2 mb-0">
                            {supplyPressure.note}
                          </p>
                        </div>
                        <span className="track-signal-row__value track-signal-row__value--status">
                          <StatusDot status={supplyPressure.status} size={7} />
                          <span className="track-signal-row__summary">
                            {supplyPressure.label}
                          </span>
                        </span>
                      </div>
                    )}

                    {pinData?.verifiedAgencyLabel ? (
                      <div className="track-signal-row">
                        <div className="track-signal-row__copy">
                          <span className="type-meta">Verified distributor</span>
                          <p className="type-note mt-2 mb-0">
                            Confirm booking status and delivery timing directly with the verified distributor.
                          </p>
                        </div>
                        <span className="track-signal-row__value">
                          <span className="track-signal-row__summary">
                            {pinData.verifiedAgencyLabel}
                          </span>
                        </span>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>

                <AnimatePresence initial={false} mode="wait">
                  {signalPanelOpen ? (
                    <motion.div
                      key="signal-panel"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.985 }}
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
                      transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                    >
                      <Card className="mb-4 track-contribute-panel">
                        <CardHeader
                          kicker="Signed-in local signal"
                          title="Add a local signal"
                          titleAs="h2"
                          actions={
                            <button
                              type="button"
                              className="track-contribute-dismiss"
                              aria-label="Close local signal panel"
                              onClick={() => {
                                rememberSignalPanelDismiss(signalDismissKey)
                                setSignalPanelOpen(false)
                              }}
                            >
                              <X size={18} />
                            </button>
                          }
                        >
                          <p className="type-card-copy mt-3 mb-0 max-w-[44ch]">
                            Share what you actually saw near this PIN. We use it to strengthen local delivery and supply signals without overstating certainty.
                          </p>
                        </CardHeader>
                        <CardBody className="stack-copy">
                          {!authLoading && !user ? (
                            <div className="stack-copy--tight">
                              <p className="type-note m-0">
                                Sign in to add a local delivery or supply signal.
                              </p>
                              <GoogleSignInButton
                                className="w-full justify-center"
                                onClick={() => onGoogleSignIn?.('/track')}
                              >
                                Sign in with Google
                              </GoogleSignInButton>
                            </div>
                          ) : (
                            <>
                              <Field id="track-signal-delivery" label="Delivery days" meta="Optional">
                                <input
                                  id="track-signal-delivery"
                                  className="input"
                                  placeholder="e.g. 5"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={signalDeliveryDays}
                                  onFocus={markSignalInteraction}
                                  onChange={(e) => {
                                    markSignalInteraction()
                                    setSignalDeliveryDays(e.target.value.replace(/\D/g, ''))
                                  }}
                                />
                              </Field>

                              <div className="field">
                                <div className="field__top">
                                  <div className="field__label">Supply pressure</div>
                                  <div className="field__meta">Optional</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  {[
                                    ['low', 'Low'],
                                    ['building', 'Building'],
                                    ['active', 'Active'],
                                    ['severe', 'Severe'],
                                  ].map(([value, label]) => (
                                    <button
                                      key={value}
                                      type="button"
                                      className={`chip transition-colors ${
                                        signalPressureLevel === value
                                          ? 'border-[var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--bg-raised))] text-[var(--accent)] shadow-[0_10px_28px_rgba(241,139,31,0.14)]'
                                          : ''
                                      }`}
                                      aria-pressed={signalPressureLevel === value}
                                      onClick={() => {
                                        markSignalInteraction()
                                        setSignalPressureLevel((prev) => (prev === value ? null : value))
                                      }}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <Field id="track-signal-note" label="Short note" meta="Optional">
                                <textarea
                                  id="track-signal-note"
                                  className="input resize-y"
                                  style={{ minHeight: 96 }}
                                  placeholder="e.g. Refill took 6 days and agency said stock was slow this week."
                                  value={signalNote}
                                  onFocus={markSignalInteraction}
                                  onChange={(e) => {
                                    markSignalInteraction()
                                    setSignalNote(e.target.value)
                                  }}
                                />
                              </Field>

                              {signalState.error ? (
                                <p className="type-note text-[var(--status-severe)] m-0">{signalState.error}</p>
                              ) : null}
                              {signalState.ok ? (
                                <p className="type-note text-[var(--status-clear)] m-0">{signalState.ok}</p>
                              ) : null}

                              <LiquidGlassBtn
                                className="w-full justify-center"
                                onClick={handleSignalSubmit}
                                disabled={!canSubmitSignal || signalSubmitting}
                              >
                                {signalSubmitting ? 'Saving...' : 'Save local signal'}
                              </LiquidGlassBtn>
                            </>
                          )}
                        </CardBody>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="signal-toggle"
                      type="button"
                      className="track-contribute-toggle mb-4"
                      aria-expanded="false"
                      onClick={() => {
                        clearSignalPanelDismiss(signalDismissKey)
                        setSignalPanelOpen(true)
                        setSignalPanelInteracted(hasSignalDraft)
                      }}
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
                    >
                      <span className="track-contribute-toggle__icon" aria-hidden="true">
                        <Target size={16} />
                      </span>
                      <span className="track-contribute-toggle__copy">
                        <span className="track-contribute-toggle__eyebrow">Community input</span>
                        <span className="track-contribute-toggle__title">Add a local signal</span>
                        <span className="track-contribute-toggle__note">
                          {signalState.ok || 'Help sharpen delivery and supply pressure around this PIN.'}
                        </span>
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>

                {pinData.urgencyScore !== undefined && (
                  <Card className="mb-4 text-center">
                    <CardHeader
                      kicker="Based on your details"
                      title="Booking priority"
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
                      kicker="Booking date"
                      title={bookingResult.daysLeft <= 0 ? 'You can book now' : 'Next booking date'}
                      titleAs="h2"
                    />

                    <div className="flex items-center gap-5">
                      <Ring daysLeft={bookingResult.daysLeft} />
                      <div>
                        {bookingResult.daysLeft <= 0 ? (
                          <p className="type-section-title text-[var(--status-clear)] mb-0">
                            Book now
                          </p>
                        ) : (
                          <p className="type-data-value type-data-value--hero mb-0">
                            {fmt(bookingResult.nextWindow)}
                          </p>
                        )}

                        {bookingResult.daysLeft > 0 && deliveryEstimate?.typicalDays != null && (
                          <p className="type-note mt-2 mb-0">
                            Estimated delivery by {fmt(addDays(bookingResult.nextWindow, Math.round(deliveryEstimate.typicalDays)))}
                          </p>
                        )}

                        <KalamkariDivider />
                        <p className="type-note mb-0">
                          Based on the{' '}
                          <span className="type-data-value text-[inherit] text-[var(--text-data)]">25</span>-day rule
                          {deliveryEstimate?.kind && deliveryEstimate.kind !== 'unknown' ? (
                            <>
                              {' '}and {deliveryEstimate.bookingCopy}
                            </>
                          ) : (
                            <> and current local delivery signals</>
                          )}
                          .
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {(supplyPressure?.level === 'active' || supplyPressure?.level === 'severe') && (
                  <Callout
                    as={motion.div}
                    tone={supplyPressure.level === 'severe' ? 'severe' : 'active'}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0.01 } : springs.urgent}
                    className="flex items-start gap-3 mb-4"
                  >
                    <StatusDot status={supplyPressure.status} size={7} />
                    <div>
                      <div
                        className="kicker mb-1"
                        style={{
                          color: supplyPressure.level === 'severe' ? 'var(--status-severe)' : 'var(--status-active)',
                        }}
                      >
                        {supplyPressure.level === 'severe' ? 'Supply pressure looks severe in your area' : 'Supply pressure looks active in your area'}
                      </div>
                      <p className="type-card-copy mb-0">
                        {supplyPressure.note} Plan ahead and confirm delivery timing before your booking window opens.
                      </p>
                    </div>
                  </Callout>
                )}

                {(supplyPressure?.level === 'active' || supplyPressure?.level === 'severe') && (
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
                      Need commercial supply?
                    </p>
                    <p className="type-note mb-3">
                      Check private LPG supplier options for restaurants, hotels, and other business use.
                    </p>
                    <button
                      onClick={onCommercialClick}
                      className="type-nav text-[var(--accent)] hover:text-[var(--accent-pop)]
                                 transition-colors duration-150"
                    >
                      See commercial options {' \u2192'}
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
                    kicker="Before you check"
                      title="What you'll get after you enter your PIN"
                      titleAs="h3"
                  >
                    <p className="type-card-copy mt-3 mb-0 max-w-[38ch]">
                      You'll get a local delivery estimate, supply pressure signal, and a practical booking date for your area.
                    </p>
                  </CardHeader>

                  <CardBody className="pt-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        {
                          icon: Clock3,
                          eyebrow: 'Delivery estimate',
                          title: 'How refills are moving near your PIN',
                          note: 'See the strongest local delivery signal we currently have, with evidence level built in.',
                        },
                        {
                          icon: MapPin,
                          eyebrow: 'Supply pressure',
                          title: 'Whether local strain is building',
                          note: 'See whether recent local reports suggest calm conditions, early pressure, or active strain.',
                        },
                        {
                          icon: CalendarRange,
                          eyebrow: 'Booking date',
                          title: 'When you can book again',
                          note: 'Use your last booking date to judge whether to book now or wait.',
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
                          <p className="type-card-title mb-1">Optional details help</p>
                          <p className="type-note mb-0">
                            Add your last booking date and cylinder level for a more accurate booking priority read.
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
