import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Loader2, Mail } from 'lucide-react'

import { supabase } from '../../supabaseClient'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import BookingDatePicker from '../track/BookingDatePicker'

const ARROW = '\u2192'

const PLUS_PREVIEW = [
  {
    title: 'Refill timing',
    text: 'Get earlier nudges when your home is moving toward the next sensible refill window.',
  },
  {
    title: 'Pressure shifts',
    text: 'See local supply pressure turn sooner, with more room to plan before a routine refill becomes urgent.',
  },
  {
    title: 'Price moves',
    text: 'Stay ahead of price changes that matter to your next booking instead of finding out after the fact.',
  },
]

function isValidPin(pin) {
  const value = String(pin || '').trim()
  if (!value) return true
  return /^[0-9]{6}$/.test(value)
}

function computeReminderSendAt(lastBooking) {
  if (!lastBooking) return null

  const booking = new Date(`${lastBooking}T00:00:00+05:30`)
  if (!Number.isFinite(booking.getTime())) return null

  booking.setUTCDate(booking.getUTCDate() + 23)
  booking.setUTCHours(3, 30, 0, 0)
  return booking.toISOString()
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default function AlertsTab({ user, authLoading }) {
  const isGmail = typeof user?.email === 'string' && user.email.toLowerCase().endsWith('@gmail.com')
  const verifiedGmail = isGmail ? user.email : null

  const [contact, setContact] = useState(verifiedGmail || '')

  useEffect(() => {
    setContact(verifiedGmail || '')
    setError('')
  }, [verifiedGmail])
  const [alertPin, setAlertPin] = useState('')
  const [alertDate, setAlertDate] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const canSubmit = useMemo(() => !!contact.trim() && !saving, [contact, saving])

  const handleFreeAlertSubmit = useCallback(async () => {
    const normalizedContact = contact.trim().toLowerCase()

    if (!normalizedContact) {
      setError('Enter your email address to continue.')
      return
    }

    if (!isValidEmail(normalizedContact)) {
      setError('Enter a valid email address.')
      return
    }

    if (!isValidPin(alertPin)) {
      setError('Enter a valid 6-digit PIN, or leave it empty.')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)

    const nextSendAt = computeReminderSendAt(alertDate)

    const { error: insertError } = await supabase.from('alert_subscriptions').insert([
      {
        contact: normalizedContact,
        pin: alertPin || null,
        last_booking: alertDate || null,
        alert_type: 'free',
        channel: 'email',
        plan_code: 'free',
        delivery_status: nextSendAt ? 'pending' : 'needs_booking_date',
        next_send_at: nextSendAt,
        reminder_type: 'booking_d_minus_2',
      },
    ])

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 6000)
  }, [contact, alertPin, alertDate])

  return (
    <div className="page-root">
      <PageHeader
        icon={Bell}
        title="Alerts"
        description="Save a free email reminder 2 days before your next booking date. Plus stays dark until delivery goes live reliably."
      />

      <div className="page-grid-dual">
        <Card className="card--utility-tight">
          <CardHeader
            title="Get a free email reminder"
            titleAs="h2"
          >
            <p className="card-header__description type-card-copy mb-0 max-w-[70ch]">
              Add your last booking date and we&apos;ll queue an email reminder 2 days before your next sensible booking date.
            </p>
          </CardHeader>

          <CardBody>
            <div className="space-y-4 mb-4">
              <Field id="free-pin" label="Your 6-digit PIN" meta="Optional">
                <input
                  className="input type-data-input"
                  placeholder="Enter your area PIN"
                  value={alertPin}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setAlertPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </Field>

              <Field id="free-date" label="Last booking date" meta="Required for the reminder schedule">
                <BookingDatePicker
                  id="free-date"
                  value={alertDate}
                  onChange={setAlertDate}
                />
              </Field>
            </div>

            <div className="mb-4">
              <Field id="free-contact" label="Email address" meta={verifiedGmail ? "Verified Gmail" : null} required>
                <input
                  className="input"
                  maxLength={255}
                  placeholder="you@example.com"
                  value={contact}
                  readOnly={!!verifiedGmail}
                  disabled={authLoading}
                  onChange={(e) => {
                    if (verifiedGmail) return
                    setContact(e.target.value)
                    setError('')
                  }}
                />
              </Field>
            </div>

            {error ? (
              <Callout tone="severe" className="mb-4" edge={false}>
                <div className="type-note text-[var(--status-severe)] font-medium">{error}</div>
              </Callout>
            ) : null}

            {saved ? (
              <Callout tone="clear" className="mb-4" edge={false}>
                <div className="type-note text-[var(--status-clear)] font-medium">
                  Reminder saved. We&apos;ll send an email reminder 2 days before your next booking date.
                </div>
              </Callout>
            ) : null}

            <button
              type="button"
              onClick={handleFreeAlertSubmit}
              disabled={!canSubmit}
              className="btn-ghost w-full justify-center"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="motion-safe:animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Save free reminder {ARROW}
                </span>
              )}
            </button>

            <p className="type-note mt-4 mb-0">
              Email is the first live channel. Gmail accounts are auto-verified when you sign in, but any valid email can save a reminder.
            </p>
          </CardBody>
        </Card>

        <Card id="plus-card" variant="featured" className="card--utility-tight">
          <CardHeader
            title="A calmer planning layer for regular LPG households"
            titleAs="h2"
            actions={(
              <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                Preview
              </span>
            )}
          >
            <p className="card-header__description type-card-copy mb-0 max-w-[70ch]">
              Plus is designed for households that want earlier signals, steadier planning, and fewer last-minute booking surprises.
            </p>
          </CardHeader>

          <CardBody>
            <div className="space-y-2 pb-6 border-b border-[var(--divider)] mb-6">
              {PLUS_PREVIEW.map(({ title, text }) => (
                <div
                  key={title}
                  className="rounded-[18px] border border-[var(--divider)] bg-[var(--bg-raised)] px-4 py-3"
                >
                  <p className="type-card-title mb-1">{title}</p>
                  <p className="type-card-copy mb-0 text-[var(--text-primary)]">{text}</p>
                </div>
              ))}
            </div>

            <Callout tone="accent" edge={false}>
              <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 text-[var(--accent)]" />
                <div>
                  <p className="type-card-title mb-1">Built carefully, not rushed</p>
                  <p className="type-note mb-0">
                    Free reminders stay first in line. Once delivery is dependable enough to support a premium layer well, Plus can open with earlier notice and richer alert types.
                  </p>
                </div>
              </div>
            </Callout>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
