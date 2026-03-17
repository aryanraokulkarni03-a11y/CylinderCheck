// src/components/modals/SupportModal.jsx
// Task 31 — Bottom sheet on mobile, centered modal on desktop
import { motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { springs } from '../../lib/springs'

export function SupportModal({ onClose }) {
  const shouldReduceMotion = useReducedMotion()
  
  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides from bottom on mobile, scales in on desktop */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : '100%' }}
        transition={shouldReduceMotion ? { duration: 0.15 } : springs.sheet}
        className="fixed bottom-0 left-0 right-0 z-[301]
                   md:inset-auto md:top-1/2 md:left-1/2
                   md:-translate-x-1/2 md:-translate-y-1/2
                   md:w-[480px]
                   bg-[var(--bg-raised)]
                   border border-[var(--border)]
                   rounded-t-[var(--radius-xl)] md:rounded-[var(--radius-xl)]
                   overflow-hidden"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Handle bar — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-[var(--border)]">
          <span className="font-display font-bold text-[18px] text-[var(--text-primary)]">
            Support & FAQ
          </span>
          <button
            onClick={onClose}
            aria-label="Close support"
            className="w-11 h-11 rounded-full flex items-center justify-center
                       text-[var(--text-muted)] hover:text-[var(--text-primary)]
                       hover:bg-[var(--bg-inset)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-5"
             style={{ maxHeight: 'calc(90dvh - 80px)' }}>

          {/* Section: Wrong Price */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em]
                           text-[var(--text-muted)] mb-3">
              Wrong Price Shown
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              LPG prices are revised on the 1st of every month. If the price looks
              wrong, the revision may not have been scraped yet. Prices usually
              update within 24 hours of the 1st.
            </p>
          </section>

          <div className="h-px bg-[var(--divider)]" />

          {/* Section: Billing */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em]
                           text-[var(--text-muted)] mb-3">
              Billing & Alerts
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              For billing issues with paid alerts, email{' '}
              <a href="mailto:support@cylindercheck.in"
                 className="text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors">
                support@cylindercheck.in
              </a>
              {' '}with your phone number and order reference.
            </p>
          </section>

          <div className="h-px bg-[var(--divider)]" />

          {/* Section: Feedback */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em]
                           text-[var(--text-muted)] mb-3">
              Feedback
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Report incorrect data, missing agencies, or suggest improvements at{' '}
              <a href="mailto:feedback@cylindercheck.in"
                 className="text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors">
                feedback@cylindercheck.in
              </a>
            </p>
          </section>

          <div className="h-px bg-[var(--divider)]" />

          {/* Section: FAQ */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em]
                           text-[var(--text-muted)] mb-3">
              FAQ
            </h3>
            <div className="space-y-3">
              {[
                ['How accurate is the delivery data?',
                 'Delivery times are community-sourced averages. Actual delivery may vary by up to 2 days.'],
                ['What is the 25-day rule?',
                 'Government regulations allow rebooking an LPG cylinder 25 days after the last booking date.'],
                ['Is CylinderCheck affiliated with any gas company?',
                 'No. We are an independent community tool, not affiliated with Indane (IndianOil), HP Gas, or Bharatgas.'],
              ].map(([q, a]) => (
                <div key={q} className="rounded-md bg-[var(--bg-inset)]
                                        border border-[var(--border)] p-4">
                  <p className="font-medium text-[13px] text-[var(--text-primary)] mb-1">{q}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Safe area for mobile bottom padding */}
          <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        </div>
      </motion.div>
    </>
  )
}

export default SupportModal
