import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';
import { Check, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { springs } from '../../lib/springs';
import { COMMERCIAL_CITIES_BY_STATE } from '../../lib/utils';

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
    <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-6 md:p-8">
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
            <h3 className="text-[22px] font-bold font-display text-[var(--status-clear)] mb-3">
              Request Received
            </h3>
            <p className="text-[14px] text-[var(--text-secondary)] max-w-[280px]">
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
              <h3 className="text-[18px] font-bold font-display text-[var(--text-primary)] mb-1">
                {isWaitlist ? 'Get Notified' : 'Get Custom Quotes'}
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)]">
                {isWaitlist
                  ? `Share your details and we'll reach out when agencies go live in ${selectedState || 'your area'}.`
                  : `Skip the calls. Get quotes from listed agencies in ${selectedState || 'your area'}.`}
              </p>
            </div>

            {/* Business type */}
            <div>
              <p className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-3">
                Business Type
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Business type">
                {BUSINESS_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={businessType === value}
                    onClick={() => setBusinessType(value)}
                    className={`py-2 px-2 rounded-md text-[12px] font-bold transition-colors border
                      ${businessType === value
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alternative needed */}
            <div>
              <p className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-3">
                Alternative Needed
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Need type">
                {NEED_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={needType === value}
                    onClick={() => setNeedType(value)}
                    className={`py-1.5 px-3 rounded-pill text-[12px] font-bold transition-colors border
                      ${needType === value
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Business name */}
            <div>
              <label htmlFor="lead-biz-name" className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">
                Business Name *
              </label>
              <input
                id="lead-biz-name"
                type="text"
                required
                autoComplete="organization"
                className={`block w-full px-4 py-2.5 bg-[var(--bg-inset)] border rounded-md
                           focus:border-[var(--accent)] focus:outline-none text-[15px]
                           text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                           ${fieldError.businessName ? 'border-[var(--status-severe)]' : 'border-[var(--border)]'}`}
                placeholder="Restaurant / Hotel Name"
                value={businessName}
                onChange={e => { setBusinessName(e.target.value); setFieldError(p => ({ ...p, businessName: '' })); }}
              />
              {fieldError.businessName && (
                <p className="text-[11px] text-[var(--status-severe)] mt-1">{fieldError.businessName}</p>
              )}
            </div>

            {/* Phone + PIN row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lead-phone" className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">
                  Mobile Number *
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  className={`block w-full px-4 py-2.5 bg-[var(--bg-inset)] border rounded-md
                             font-data tracking-widest text-[16px] text-[var(--text-data)]
                             focus:border-[var(--accent)] focus:outline-none
                             placeholder:tracking-normal placeholder:font-body
                             placeholder:text-[15px] placeholder:text-[var(--text-muted)]
                             ${fieldError.phone ? 'border-[var(--status-severe)]' : 'border-[var(--border)]'}`}
                  placeholder="10-digit number"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setFieldError(p => ({ ...p, phone: '' })); }}
                />
                {fieldError.phone && (
                  <p className="text-[11px] text-[var(--status-severe)] mt-1">{fieldError.phone}</p>
                )}
              </div>
              <div>
                <label htmlFor="lead-pin" className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">
                  PIN Code <span className="text-[var(--text-muted)] text-[10px] normal-case tracking-normal font-body font-normal">(optional)</span>
                </label>
                <input
                  id="lead-pin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="block w-full px-4 py-2.5 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md
                             font-data tracking-widest text-[16px] text-[var(--text-data)]
                             focus:border-[var(--accent)] focus:outline-none
                             placeholder:tracking-normal placeholder:font-body placeholder:text-[15px] placeholder:text-[var(--text-muted)]"
                  placeholder="6-digit PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            {/* Cylinders per week */}
            <div>
              <label htmlFor="lead-cylinders" className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">
                Cylinders per week <span className="text-[var(--text-muted)] text-[10px] normal-case tracking-normal font-body font-normal">(optional)</span>
              </label>
              <input
                id="lead-cylinders"
                type="text"
                inputMode="numeric"
                maxLength={3}
                className="block w-full px-4 py-2.5 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md
                           font-data text-[16px] text-[var(--text-data)]
                           focus:border-[var(--accent)] focus:outline-none
                           placeholder:font-body placeholder:text-[15px] placeholder:text-[var(--text-muted)]"
                placeholder="e.g. 4"
                value={cylindersWeek}
                onChange={e => setCylindersWeek(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="lead-message" className="block text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-2">
                Additional context <span className="text-[var(--text-muted)] text-[10px] normal-case tracking-normal font-body font-normal">(optional)</span>
              </label>
              <textarea
                id="lead-message"
                className="block w-full px-4 py-2.5 bg-[var(--bg-inset)] border border-[var(--border)] rounded-md
                           focus:border-[var(--accent)] focus:outline-none text-[15px] text-[var(--text-primary)]
                           placeholder:text-[var(--text-muted)] resize-y min-h-[80px]"
                placeholder="e.g. Need emergency supply by Friday, Ramzan catering..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                className="text-[12px] text-[var(--status-severe)] font-medium
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
