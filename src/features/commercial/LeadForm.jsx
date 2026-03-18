import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';
import { Check, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { springs } from '../../lib/springs';
import { COMMERCIAL_CITIES_BY_STATE } from '../../lib/utils';
import { Field } from '../../components/ui/Field';

// Aligned to actual commercial_leads DB schema:
// business_name, business_type, city, pin, phone, need_type, cylinders_week, message
// Note: Commercial UX selects a "state". We still store a primary city for now (for matching),
// and include the state in the message payload for manual routing.

const BUSINESS_TYPES = [
  { value: 'restaurant',     label: 'Restaurant' },
  { value: 'hotel',          label: 'Hotel' },
  { value: 'dhaba',          label: 'Dhaba' },
  { value: 'cloud_kitchen',  label: 'Cloud Kitchen' },
  { value: 'catering',       label: 'Catering' },
  { value: 'other',          label: 'Other' },
];

const NEED_TYPES = [
  { value: 'induction',  label: 'Induction' },
  { value: 'electric',   label: 'Electric' },
  { value: 'kerosene',   label: 'Kerosene' },
  { value: 'png',        label: 'PNG/Piped' },
  { value: 'not_sure',   label: 'Not Sure' },
];

export default function LeadForm({ selectedState = '', vendorsCount = 0, vendorsLoading = false }) {
  const shouldReduceMotion = useReducedMotion();
  const isWaitlist = !vendorsLoading && (Number(vendorsCount) || 0) <= 0;
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [needType, setNeedType] = useState('induction');
  const [cylindersWeek, setCylindersWeek] = useState('');
  const [message, setMessage] = useState('');

  const [fieldError, setFieldError] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const validate = () => {
    const errors = {};
    if (!businessName.trim()) errors.businessName = 'Business name is required.';
    if (!phone.trim() || phone.length < 10) errors.phone = 'Enter a valid 10-digit number.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldError(errors); return; }

    setFieldError({});
    setSubmitError(null);
    setLoading(true);

    try {
      const leadCity = selectedState ? (COMMERCIAL_CITIES_BY_STATE[selectedState] || [])[0] : null;
      const userMessage = message.trim();
      const metaLines = [];
      if (selectedState) metaLines.push(`State: ${selectedState}`);
      const finalMessage = [userMessage || null, metaLines.length ? metaLines.join('\n') : null]
        .filter(Boolean)
        .join('\n\n') || null;

      const { error: dbError } = await supabase.from('commercial_leads').insert([{
        business_name:  businessName.trim(),
        business_type:  businessType,
        city:           leadCity || null,
        pin:            pin || null,
        phone:          phone.trim(),
        need_type:      needType,
        cylinders_week: cylindersWeek ? parseInt(cylindersWeek, 10) : null,
        message:        finalMessage,
      }]);

      if (dbError) throw dbError;
      setSuccess(true);

      // Reset after 5s
      setTimeout(() => {
        setSuccess(false);
        setBusinessName(''); setPhone(''); setPin('');
        setCylindersWeek(''); setMessage('');
        setBusinessType('restaurant'); setNeedType('induction');
      }, 5000);

    } catch (err) {
      setSubmitError(isWaitlist ? 'Failed to submit. Please try again in a moment.' : 'Failed to submit. Please try calling vendors directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card--roomy relative overflow-hidden">
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
            <h3 className="text-[var(--fs-h3)] font-bold font-display text-[var(--status-clear)] mb-3">
              Request Received
            </h3>
            <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] max-w-[280px]">
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
            <div className="mb-2">
              <h3 className="text-[var(--fs-body-lg)] font-bold font-display text-[var(--text-primary)] mb-1">
                {isWaitlist ? 'Get Notified' : 'Get Custom Quotes'}
              </h3>
              <p className="text-[var(--fs-sm)] text-[var(--text-secondary)]">
                {isWaitlist
                  ? `Share your details and we'll reach out when agencies go live in ${selectedState || 'your area'}.`
                  : `Skip the calls. Get quotes from listed agencies in ${selectedState || 'your area'}.`}
              </p>
            </div>

            {/* Business type */}
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

            {/* Alternative needed */}
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

            {/* Business name */}
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
                onChange={e => { setBusinessName(e.target.value); setFieldError(p => ({ ...p, businessName: '' })); }}
              />
            </Field>

            {/* Phone + PIN row */}
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
                  className="input tracking-[0.14em] text-[var(--text-data)]"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setFieldError(p => ({ ...p, phone: '' })); }}
                />
              </Field>

              <Field id="lead-pin" label="PIN code" meta="Optional">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input tracking-[0.14em] text-[var(--text-data)]"
                  placeholder="6-digit PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
            </div>

            {/* Cylinders per week */}
            <Field id="lead-cylinders" label="Cylinders per week" meta="Optional">
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                className="input tracking-[0.14em] text-[var(--text-data)]"
                placeholder="e.g. 4"
                value={cylindersWeek}
                onChange={e => setCylindersWeek(e.target.value.replace(/\D/g, ''))}
              />
            </Field>

            {/* Message */}
            <Field id="lead-message" label="Additional context" meta="Optional">
              <textarea
                className="input resize-y min-h-[80px]"
                placeholder="e.g. Need emergency supply by Friday, Ramzan catering..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </Field>

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                className="text-[var(--fs-xs)] text-[var(--status-severe)] font-medium
                           bg-[var(--status-severe-soft)] px-3 py-2 rounded-md border border-[var(--status-severe-border)]"
              >
                {submitError}
              </motion.div>
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
                  {isWaitlist ? 'Notify me' : 'Request Quotes'} <Send size={16} />
                </span>
              )}
            </LiquidGlassBtn>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
