// src/features/alerts/AlertsTab.jsx
// Alerts: free booking reminder + Plus subscription (Razorpay).

import { useCallback, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { BadgeCheck, Bell, Check, Loader2, ShieldAlert, Zap } from 'lucide-react'

import { supabase } from '../../supabaseClient'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { SlideUp } from '../../components/motion/SlideUp'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`

const RUPEE = '\u20B9'
const DOT = '\u00B7'
const ARROW = '\u2192'

const PLUS_FEATURES = [
  ['WINDOW', 'WhatsApp/SMS alert 2 days before your booking window'],
  ['WARN', 'Early shortage warning for your PIN, before it spreads'],
  ['PRICE', 'Price revision heads-up 24 hours before news breaks'],
  ['PING', 'Delivery day status ping so you are home on time'],
  ['SCORE', 'Monthly supply health score for your area'],
]

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function isValidPin(pin) {
  const p = String(pin || '').trim()
  if (!p) return true
  return /^[0-9]{6}$/.test(p)
}

export default function AlertsTab() {
  const shouldReduceMotion = useReducedMotion()

  const [contact, setContact] = useState('')
  const [alertPin, setAlertPin] = useState('')
  const [alertDate, setAlertDate] = useState('')

  const [freeAlertSaving, setFreeAlertSaving] = useState(false)
  const [freeAlertError, setFreeAlertError] = useState('')
  const [alertSaved, setAlertSaved] = useState(false)

  const [payContact, setPayContact] = useState('')
  const [payPin, setPayPin] = useState('')
  const [paying, setPaying] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [payError, setPayError] = useState('')

  const canFreeSubmit = useMemo(() => !!contact.trim() && !freeAlertSaving, [contact, freeAlertSaving])
  const canPay = useMemo(() => !!payContact.trim() && !paying, [payContact, paying])

  const scrollToPlus = useCallback(() => {
    const el = document.getElementById('plus-card')
    if (!el) return
    el.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [shouldReduceMotion])

  const handleFreeAlertSubmit = useCallback(async () => {
    const c = contact.trim()
    if (!c) {
      setFreeAlertError('Enter your mobile number or email.')
      return
    }
    if (!isValidPin(alertPin)) {
      setFreeAlertError('Enter a valid 6-digit PIN, or leave it empty.')
      return
    }

    setFreeAlertSaving(true)
    setFreeAlertError('')
    setAlertSaved(false)

    const { error } = await supabase.from('alert_subscriptions').insert([
      {
        contact: c,
        pin: alertPin || null,
        last_booking: alertDate || null,
        alert_type: 'free',
      },
    ])

    if (error) {
      setFreeAlertError('Something went wrong. Please try again.')
      setFreeAlertSaving(false)
      return
    }

    setFreeAlertSaving(false)
    setAlertSaved(true)
    setTimeout(() => setAlertSaved(false), 6000)
  }, [contact, alertPin, alertDate])

  const handlePayment = useCallback(async () => {
    const c = payContact.trim()
    if (!c) {
      setPayError('Enter your mobile or email to continue.')
      return
    }
    if (!isValidPin(payPin)) {
      setPayError('Enter a valid 6-digit PIN, or leave it empty.')
      return
    }
    if (!RAZORPAY_KEY_ID) {
      setPayError('Missing Razorpay key (VITE_RAZORPAY_KEY_ID).')
      return
    }
    if (!SUPABASE_ANON_KEY || !SUPABASE_FUNC_URL.includes('http')) {
      setPayError('Missing Supabase config. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    setPayError('')
    setPaying(true)

    const loaded = await loadRazorpay()
    if (!loaded) {
      setPayError('Could not load payment gateway.')
      setPaying(false)
      return
    }

    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ contact: c, pin: payPin || null }),
      })

      const json = await res.json().catch(() => ({}))
      const orderId = json?.order_id
      const orderErr = json?.error

      if (!orderId) {
        setPayError(orderErr || 'Could not create order.')
        setPaying(false)
        return
      }

      const themeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim()

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: 4900,
        currency: 'INR',
        order_id: orderId,
        name: 'CylinderCheck',
        description: 'Plus - Monthly Subscription',
        prefill: { contact: c },
        modal: {
          backdropclose: false,
          ondismiss: () => setPaying(false),
        },
        handler: async (response) => {
          try {
            const vr = await fetch(`${SUPABASE_FUNC_URL}/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ ...response, contact: c, pin: payPin || null }),
            })

            const vjson = await vr.json().catch(() => ({}))
            if (vjson?.success) {
              setPaySuccess(true)
              setPaying(false)
              return
            }
            setPayError(vjson?.error || 'Payment verification failed.')
            setPaying(false)
          } catch {
            setPayError('Payment verification failed.')
            setPaying(false)
          }
        },
      }

      if (themeColor) options.theme = { color: themeColor }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        setPayError('Payment failed. Please try again.')
        setPaying(false)
      })
      rzp.open()
    } catch {
      setPayError('Something went wrong. Try again.')
      setPaying(false)
    }
  }, [payContact, payPin])

  return (
    <div className="pb-16 w-full min-w-0">
      <PageHeader
        markerStatus="active"
        markerLabel="Alerts"
        markerSublabel="Signals and reminders"
        icon={Bell}
        title="Alerts"
        description="Get a ping before your next booking window, and early warnings when supply tightens in your area."
      />

      <div className="grid lg:grid-cols-2 gap-6 items-start min-w-0">
        <SlideUp delay={0.02} className="w-full min-w-0">
          <Card>
            <CardHeader
              kicker="Booking window reminder"
              title="Know when to book"
              titleAs="h2"
              actions={
                <button
                  type="button"
                  onClick={scrollToPlus}
                  className="type-nav text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors"
                >
                  Plus details {ARROW}
                </button>
              }
            >
              <div className="mt-3">
                <span className="badge text-[var(--status-clear)] bg-[var(--status-clear-soft)] border border-[var(--status-clear-border)]">
                  Free
                </span>
              </div>
              <p className="type-card-copy mt-4 mb-0 max-w-[70ch]">
                Enter your last booking date and we will alert you 2 days before your next window opens. No app. No spam.
              </p>
            </CardHeader>

            <CardBody>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field id="free-pin" label="PIN" meta="Optional">
                <input
                  className="input type-data-input"
                  placeholder="6-digit PIN"
                  value={alertPin}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setAlertPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </Field>

              <Field id="free-date" label="Last booking" meta="Optional">
                <input
                  type="date"
                  className="input"
                  value={alertDate}
                  onChange={(e) => setAlertDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="mb-4">
              <Field id="free-contact" label="Mobile or email" required>
                <input
                  className="input"
                  placeholder="98xxxxxxxx or you@email.com"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value)
                    setFreeAlertError('')
                  }}
                />
              </Field>
            </div>

            {freeAlertError && (
              <Callout tone="severe" className="mb-4" edge={false}>
                <div className="type-note text-[var(--status-severe)] font-medium">{freeAlertError}</div>
              </Callout>
            )}

            {alertSaved && (
              <Callout tone="clear" className="mb-4" edge={false}>
                <div className="type-note text-[var(--status-clear)] font-medium flex items-center gap-2">
                  <Check size={14} />
                  Alert activated. We will message you 2 days before your window opens.
                </div>
              </Callout>
            )}

            <button
              type="button"
              onClick={handleFreeAlertSubmit}
              disabled={!canFreeSubmit}
              className="btn-ghost w-full justify-center"
            >
              {freeAlertSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="motion-safe:animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Enable free alerts {ARROW}
                </span>
              )}
            </button>

            <p className="type-note mt-4 mb-0">
              You can opt out anytime by replying STOP.
            </p>
            </CardBody>
          </Card>
        </SlideUp>

        <SlideUp delay={0.06} className="w-full min-w-0">
          <Card id="plus-card" variant="featured">
            <CardHeader
              kicker="Early access"
              title={
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck size={22} className="text-[var(--accent)]" />
                  CylinderCheck Plus
                </span>
              }
              titleAs="h2"
              actions={
                <div className="text-right">
                  <div className="type-data-value type-data-value--hero text-[var(--text-primary)] leading-none">
                    {RUPEE}49
                  </div>
                  <div className="kicker mt-1">per month</div>
                </div>
              }
            >
              <div className="mt-3">
                <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                  Plus
                </span>
              </div>
              <p className="type-card-copy mt-4 mb-0 max-w-[70ch]">
                Shortage intelligence for households. Calm, precise, and pin-level when it matters.
              </p>
            </CardHeader>

            <CardBody>

            <div className="space-y-3 pb-6 border-b border-[var(--divider)] mb-6">
              {PLUS_FEATURES.map(([tag, text]) => (
                <div key={tag} className="flex items-start gap-3">
                  <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                    {tag}
                  </span>
                  <span className="type-card-copy text-[var(--text-primary)]">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {paySuccess ? (
              <div className="rounded-md bg-[var(--status-clear-soft)] border border-[var(--status-clear-border)] p-5">
                <div className="flex items-center gap-2 text-[var(--status-clear)] font-medium">
                  <Check size={16} />
                  You are a Plus member.
                </div>
                <p className="type-card-copy mt-2 mb-0">
                  Alerts will be sent to <span className="font-medium">{payContact}</span>.
                </p>
              </div>
            ) : (
              <div>
                <Field id="plus-contact" label="Mobile or email" required>
                  <input
                    className="input"
                    placeholder="98xxxxxxxx or you@email.com"
                    value={payContact}
                    onChange={(e) => {
                      setPayContact(e.target.value)
                      setPayError('')
                    }}
                  />
                </Field>

                <Field id="plus-pin" label="PIN" meta="Optional">
                  <input
                    className="input type-data-input"
                    placeholder="6-digit PIN"
                    value={payPin}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setPayPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </Field>

                {payError && (
                  <Callout tone="severe" className="mt-4" edge={false}>
                    <div className="type-note text-[var(--status-severe)] font-medium">{payError}</div>
                  </Callout>
                )}

                <LiquidGlassBtn
                  className="w-full justify-center mt-4"
                  onClick={handlePayment}
                  disabled={!canPay}
                >
                  {paying ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="motion-safe:animate-spin" />
                      Opening payment...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Zap size={16} />
                      Get Plus {ARROW}
                    </span>
                  )}
                </LiquidGlassBtn>

                <div className="flex items-center justify-center gap-3 type-note">
                  <span className="inline-flex items-center gap-2">
                    <ShieldAlert size={12} />
                    Razorpay
                  </span>
                  <span className="text-[var(--divider)]" aria-hidden="true">
                    {DOT}
                  </span>
                  <span>Cancel anytime</span>
                </div>
              </div>
            )}
            </CardBody>
          </Card>
        </SlideUp>
      </div>
    </div>
  )
}
