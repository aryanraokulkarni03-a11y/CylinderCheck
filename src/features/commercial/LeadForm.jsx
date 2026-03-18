import React, { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Loader2, Send } from 'lucide-react'

import { supabase } from '../../supabaseClient'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { springs } from '../../lib/springs'
import { COMMERCIAL_CITIES_BY_STATE } from '../../lib/utils'
import { Field } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'

// Aligned to actual commercial_leads DB schema:
// business_name, business_type, city, pin, phone, need_type, cylinders_week, message
// Commercial UX selects a state, then stores the primary city for matching and
// appends the selected state to the message for manual routing.

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'dhaba', label: 'Dhaba' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen' },
  { value: 'catering', label: 'Catering' },
  { value: 'other', label: 'Other' },
]

const NEED_TYPES = [
  { value: 'induction', label: 'Induction' },
  { value: 'electric', label: 'Electric' },
  { value: 'kerosene', label: 'Kerosene' },
  { value: 'png', label: 'PNG/Piped' },
  { value: 'not_sure', label: 'Not Sure' },
]

export default function LeadForm({ selectedState = '', vendorsCount = 0, vendorsLoading = false }) {
  const shouldReduceMotion = useReducedMotion()
  const isWaitlist = !vendorsLoading && (Number(vendorsCount) || 0) <= 0

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [needType, setNeedType] = useState('induction')
  const [cylindersWeek, setCylindersWeek] = useState('')
  const [message, setMessage] = useState('')

  const [fieldError, setFieldError] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const validate = () => {
    const errors = {}
    if (!businessName.trim()) errors.businessName = 'Business name is required.'
    if (!phone.trim() || phone.length < 10) errors.phone = 'Enter a valid 10-digit number.'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldError(errors)
      return
    }

    setFieldError({})
    setSubmitError(null)
    setLoading(true)

    try {
      const leadCity = selectedState ? (COMMERCIAL_CITIES_BY_STATE[selectedState] || [])[0] : null
      const userMessage = message.trim()
      const metaLines = []
      if (selectedState) metaLines.push(`State: ${selectedState}`)
      const finalMessage = [userMessage || null, metaLines.length ? metaLines.join('\n') : null]
        .filter(Boolean)
        .join('\n\n') || null

      const { error: dbError } = await supabase.from('commercial_leads').insert([{
        business_name: businessName.trim(),
        business_type: businessType,
        city: leadCity || null,
        pin: pin || null,
        phone: phone.trim(),
        need_type: needType,
        cylinders_week: cylindersWeek ? parseInt(cylindersWeek, 10) : null,
        message: finalMessage,
      }])

      if (dbError) throw dbError

      setSuccess(true)

      window.setTimeout(() => {
        setSuccess(false)
        setBusinessName('')
        setPhone('')
        setPin('')
        setCylindersWeek('')
        setMessage('')
        setBusinessType('restaurant')
        setNeedType('induction')
      }, 5000)
    } catch {
      setSubmitError(
        isWaitlist
          ? 'That did not go through. Try again in a moment.'
          : 'That did not go through. You can still contact listed agencies directly.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      variant={isWaitlist ? 'inset' : 'raised'}
      edge={true}
      status={isWaitlist ? 'early' : 'clear'}
      className="card--roomy relative overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
            className="flex flex-col items-center justify-center text-center py-12 min-h-[300px]"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--status-clear-soft)] flex items-center justify-center mb-6 border border-[var(--status-clear-border)]">
              <Check size={32} className="text-[var(--status-clear)]" />
            </div>
            <h3 className="type-section-title text-[var(--status-clear)] mb-3">
              Request Received
            </h3>
            <p className="type-card-copy max-w-[280px]">
              {isWaitlist
                ? `You're on the list for ${selectedState || 'your area'}. We'll reach out as soon as listings go live.`
                : `We will connect you with listed agencies in ${selectedState || 'your area'}.`}
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
          >
            <CardHeader
              kicker={isWaitlist ? 'Waitlist' : 'Commercial matching'}
              kickerCaps={true}
              title={isWaitlist ? 'Get notified' : 'Get custom quotes'}
              meta={selectedState || 'India'}
            >
              <p className="type-card-copy mt-3 mb-0 max-w-[32ch]">
                {isWaitlist
                  ? `Share your details and we'll reach out when agencies go live in ${selectedState || 'your area'}.`
                  : `Skip the calls. Get quotes from listed agencies in ${selectedState || 'your area'}.`}
              </p>
            </CardHeader>

            <CardBody className="space-y-6">
              <div className="field">
                <div className="field__top">
                  <div className="field__label">Business type</div>
                </div>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Business type">
                  {BUSINESS_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={businessType === value}
                      onClick={() => setBusinessType(value)}
                      className="chip"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <div className="field__top">
                  <div className="field__label">Alternative needed</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Need type">
                  {NEED_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={needType === value}
                      onClick={() => setNeedType(value)}
                      className="pill"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Field
                id="lead-biz-name"
                label="Business name"
                required
                error={fieldError.businessName || null}
              >
                <input
                  type="text"
                  required
                  autoComplete="organization"
                  className="input"
                  placeholder="Restaurant / Hotel Name"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value)
                    setFieldError((prev) => ({ ...prev, businessName: '' }))
                  }}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="lead-phone"
                  label="Mobile number"
                  required
                  error={fieldError.phone || null}
                >
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    className="input type-data-input"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                      setFieldError((prev) => ({ ...prev, phone: '' }))
                    }}
                  />
                </Field>

                <Field id="lead-pin" label="PIN code" meta="Optional">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input type-data-input"
                    placeholder="6-digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>

              <Field id="lead-cylinders" label="Cylinders per week" meta="Optional">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  className="input type-data-input"
                  placeholder="e.g. 4"
                  value={cylindersWeek}
                  onChange={(e) => setCylindersWeek(e.target.value.replace(/\D/g, ''))}
                />
              </Field>

              <Field id="lead-message" label="Additional context" meta="Optional">
                <textarea
                  className="input resize-y min-h-[80px]"
                  placeholder="e.g. Need emergency supply by Friday, Ramzan catering..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field>

              {submitError && (
                <Callout tone="severe" edge={false}>
                  <div className="type-note text-[var(--status-severe)] font-medium">
                    {submitError}
                  </div>
                </Callout>
              )}

              <LiquidGlassBtn
                type="submit"
                disabled={loading || !businessName || !phone}
                className="w-full justify-center py-3 mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="motion-safe:animate-spin" /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isWaitlist ? 'Notify me' : 'Request quotes'} <Send size={16} />
                  </span>
                )}
              </LiquidGlassBtn>
            </CardBody>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  )
}
