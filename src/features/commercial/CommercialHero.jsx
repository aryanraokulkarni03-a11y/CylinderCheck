// src/features/commercial/CommercialHero.jsx
// Editorial hero (Aigle-inspired): calm, premium, crisis-clear.

import { useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Store } from 'lucide-react'

import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { springs } from '../../lib/springs'

const ARROW = '\u2192'

export default function CommercialHero() {
  const shouldReduceMotion = useReducedMotion()

  const scrollToVendors = useCallback(() => {
    document
      .getElementById('commercial-vendors')
      ?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [shouldReduceMotion])

  return (
    <section className="commercial-hero relative w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
        className="commercial-hero__grid grid md:grid-cols-12 gap-6 md:gap-8 items-start"
      >
        <div className="commercial-hero__copy md:col-span-8">
          <h1 className="commercial-hero__title hero-title text-[var(--text-primary)]">
            <span className="commercial-hero__title-row">
              <span className="commercial-hero__title-icon" aria-hidden="true">
                <Store size={24} className="text-[var(--accent)]" />
              </span>
              <span>Private LPG suppliers</span>
            </span>
          </h1>

          <p className="commercial-hero__desc type-page-desc">
            Browse suppliers state by state, compare tracked 19kg prices, and review contact details before you call.
          </p>

          <div className="commercial-hero__cta-row">
            <LiquidGlassBtn onClick={scrollToVendors} className="justify-center">
              Browse suppliers {ARROW}
            </LiquidGlassBtn>
          </div>

        </div>

        <div className="commercial-hero__panel md:col-span-4">
          <div className="glass-mid rounded-[var(--radius-lg)] p-6 md:p-7">
            <div className="kicker">
              How to use this page
            </div>

            <div className="mt-4 space-y-4 type-card-copy">
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  01
                </span>
                <span>Check the tracked 19kg city price first so you know the current market range.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  02
                </span>
                <span>Review supplier notes, service coverage, and contact details.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  03
                </span>
                <span>Confirm rate, stock, and delivery terms before you pay.</span>
              </div>
            </div>

            <div className="mt-6 rounded-md bg-[var(--bg-inset)] border border-[var(--divider)] px-4 py-3 type-note">
              CylinderCheck lists suppliers and tracked market prices. Final quotes come from the supplier.
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
