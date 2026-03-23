// src/features/track/TrackTab.jsx
// Booking tracker + shortage pressure by PIN.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MapPin, Target, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { UrgencyScore } from './UrgencyScore'
import { Ring } from '../../components/shared/Ring'
import { SignalRoom } from './SignalRoom'
import { PriceTicker } from '../../components/shared/PriceTicker'
import { SlideUp } from '../../components/motion/SlideUp'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { StatusDot } from '../../components/shared/StatusDot'
import BeforeYouCheckSection from '../../components/shared/BeforeYouCheckSection'
import BookingDatePicker from './BookingDatePicker'
import { floatingAssistMotion, springs } from '../../lib/springs'
import { addDays, fmt } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import { supabase } from '../../supabaseClient'

const ARROW = '\u2192'
const SIGNAL_SUBMISSION_COOLDOWN_MS = 12 * 60 * 60 * 1000
const TRACK_REPORT_PREFILL_KEY = 'cc-track-report-prefill:v1'

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
  trackResultToken,
  handleTrack,
  resultRef,
  shortageSummary,
  mapPrices,
  pricesUpdatedAt,
  user,
  authLoading,
  onGoogleSignIn,
  onCommercialClick,
  onReportIssue,
}) {
  const shouldReduceMotion = useReducedMotion()
  const [signalDeliveryDays, setSignalDeliveryDays] = useState('')
  const [signalPressureLevel, setSignalPressureLevel] = useState(null)
  const [signalNote, setSignalNote] = useState('')
  const [signalSubmitting, setSignalSubmitting] = useState(false)
  const [signalState, setSignalState] = useState({ ok: '', error: '' })
  const [signalPanelOpen, setSignalPanelOpen] = useState(false)
  const [signalPanelInteracted, setSignalPanelInteracted] = useState(false)
  const [signalPanelMode, setSignalPanelMode] = useState('closed')
  const skipNextPanelAutoOpenRef = useRef(false)
  const panelEntryTimeoutRef = useRef(null)

  const deliveryEstimate = pinData?.deliveryEstimate || null
  const supplyPressure = pinData?.supplyPressure || null
  const communityInsight = pinData?.communityInsight || null
  const pressure = pressurePill(supplyPressure)
  const hasSignalDraft =
    !!signalDeliveryDays || !!signalPressureLevel || signalNote.trim().length > 0
  const weakEvidenceRead =
    communityInsight?.isEmpty ||
    deliveryEstimate?.confidence === 'limited' ||
    supplyPressure?.level === 'limited' ||
    (deliveryEstimate?.confidence === 'low' && (pinData?.reportCount || 0) < 2)
  const evidencePromptTone =
    communityInsight?.isEmpty || supplyPressure?.level === 'limited' ? 'early' : 'accent'

  const canSubmitSignal =
    !!user &&
    !!pinData?.pin &&
    (
      (signalDeliveryDays && Number(signalDeliveryDays) >= 1 && Number(signalDeliveryDays) <= 30) ||
      !!signalPressureLevel
    )

  const clearPendingSignalPanelEntry = () => {
    if (panelEntryTimeoutRef.current) {
      window.clearTimeout(panelEntryTimeoutRef.current)
      panelEntryTimeoutRef.current = null
    }
  }

  useEffect(() => {
    clearPendingSignalPanelEntry()

    if (!pinData?.pin || !trackResultToken) return

    if (weakEvidenceRead) {
      setSignalPanelOpen(false)
      setSignalPanelInteracted(false)
      setSignalPanelMode('closed')
      return
    }

    if (skipNextPanelAutoOpenRef.current) {
      skipNextPanelAutoOpenRef.current = false
      setSignalPanelOpen(false)
      setSignalPanelInteracted(false)
      setSignalPanelMode('closed')
      return
    }

    panelEntryTimeoutRef.current = window.setTimeout(() => {
      setSignalPanelOpen(true)
      setSignalPanelInteracted(false)
      setSignalPanelMode('passive')
      panelEntryTimeoutRef.current = null
    }, floatingAssistMotion.passiveEntryDelayMs)

    setSignalPanelOpen(false)
    setSignalPanelInteracted(false)

    return () => clearPendingSignalPanelEntry()
  }, [pinData?.pin, trackResultToken, weakEvidenceRead])

  useEffect(() => {
    if (!pinData?.pin || !signalPanelOpen || signalPanelInteracted || signalPanelMode !== 'passive') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      closeSignalPanel()
    }, floatingAssistMotion.passiveVisibleMs)

    return () => window.clearTimeout(timeoutId)
  }, [pinData?.pin, signalPanelOpen, signalPanelInteracted, signalPanelMode])

  useEffect(() => {
    if (!signalPanelOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeSignalPanel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [signalPanelOpen])

  const markSignalInteraction = () => {
    if (!signalPanelInteracted) setSignalPanelInteracted(true)
  }

  const closeSignalPanel = () => {
    clearPendingSignalPanelEntry()
    setSignalPanelOpen(false)
    setSignalPanelInteracted(false)
    setSignalPanelMode('closed')
  }

  const openSignalPanel = (mode = 'manual') => {
    clearPendingSignalPanelEntry()
    setSignalPanelOpen(true)
    setSignalPanelMode(mode)
    setSignalPanelInteracted(mode === 'manual' ? hasSignalDraft : false)
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
    setSignalPanelOpen(false)
    setSignalPanelInteracted(false)
    setSignalPanelMode('closed')
    await handleTrack()
  }

  const handleReportIssue = () => {
    if (!pinData?.pin) return

    const area = String(pinData.area || '').trim()
    const city = String(pinData.city || '').split(',')[0].trim()
    const prefill = {
      source: 'track',
      pin: pinData.pin,
      city: area || city || '',
      contextLabel: area || city || `PIN ${pinData.pin}`,
    }

    try {
      sessionStorage.setItem(TRACK_REPORT_PREFILL_KEY, JSON.stringify(prefill))
    } catch {
      // Ignore private mode / storage failures.
    }

    onReportIssue?.(prefill)
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
              title="Check your area before you book"
              titleAs="h2"
            >
              <p className="type-card-copy mt-2 mb-0">
                Use your PIN to see a local delivery estimate, supply pressure signal, and the next sensible booking date.
              </p>
            </CardHeader>

            <CardBody>
            <div className="mb-6">
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

                    {communityInsight ? (
                      <div className="track-signal-row">
                        <div className="track-signal-row__copy">
                          <span className="type-meta">Community signals</span>
                          <span className="track-signal-row__summary track-signal-row__summary--inline">
                            {communityInsight.summary}
                          </span>
                          <p className="type-note mt-2 mb-0">
                            {communityInsight.note}
                          </p>
                          {communityInsight.ctaLabel ? (
                            <button
                              type="button"
                              className="track-signal-row__inline-action mt-3"
                              onClick={() => openSignalPanel('manual')}
                            >
                              {communityInsight.ctaLabel}
                            </button>
                          ) : null}
                          {communityInsight.quote ? (
                            <p className="type-note mt-2 mb-0 italic text-[var(--text-secondary)]">
                              {communityInsight.quote}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

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

                <div className="track-contribute-stage mb-4">
                  {weakEvidenceRead ? (
                    <Callout
                      tone={evidencePromptTone}
                      className="track-evidence-callout mb-4"
                    >
                      <div className="track-evidence-callout__copy">
                        <p className="kicker mb-2 text-[var(--accent)]">
                          Help sharpen this PIN
                        </p>
                        <p className="type-card-title mb-2">
                          This area still needs stronger local evidence
                        </p>
                        <p className="type-note mb-0">
                          {communityInsight?.isEmpty
                            ? 'A quick signed-in signal or a fuller area report will make this read more useful for the next person checking this PIN.'
                            : 'We already have some signal here, but another grounded local update will make the planning read stronger and less guess-based.'}
                        </p>
                      </div>

                      <div className="track-evidence-callout__actions">
                        <LiquidGlassBtn
                          className="track-evidence-callout__button justify-center"
                          onClick={() => openSignalPanel('manual')}
                        >
                          {communityInsight?.isEmpty ? 'Add quick signal' : 'Add your signal'}
                        </LiquidGlassBtn>

                        <button
                          type="button"
                          className="track-evidence-callout__link"
                          onClick={handleReportIssue}
                        >
                          Report an issue instead {ARROW}
                        </button>
                      </div>
                    </Callout>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {signalPanelOpen ? (
                      <div key="signal-panel" className="track-contribute-float">
                        <motion.div
                          className="track-contribute-float__surface"
                          initial={shouldReduceMotion ? { opacity: 1 } : floatingAssistMotion.panelEnter}
                          animate={shouldReduceMotion ? { opacity: 1 } : floatingAssistMotion.panelActive}
                          exit={shouldReduceMotion ? { opacity: 0 } : floatingAssistMotion.panelExit}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0.01 }
                              : floatingAssistMotion.panelTransition
                          }
                        >
                          <Card className="track-contribute-panel">
                          <CardHeader
                            kicker="Signed-in local signal"
                            title="Add a local signal"
                            titleAs="h2"
                            actions={
                              <button
                                type="button"
                                className="track-contribute-dismiss"
                                aria-label="Close local signal panel"
                                onClick={closeSignalPanel}
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
                                    maxLength={300}
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
                      </div>
                    ) : null}
                  </AnimatePresence>
                </div>

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
                <BeforeYouCheckSection
                  className="card--spacious min-h-[300px] w-full border-[var(--border)]"
                  titleAs="h3"
                />
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
