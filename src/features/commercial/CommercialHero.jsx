// src/features/commercial/CommercialHero.jsx
// Editorial hero (Aigle-inspired): calm, premium, crisis-clear.

import { useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ShieldCheck, PhoneCall } from 'lucide-react'

import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { springs } from '../../lib/springs'

const DOT = '\u00B7'
const ARROW = '\u2192'

export default function CommercialHero() {
  const shouldReduceMotion = useReducedMotion()

  const scrollToVendors = useCallback(() => {
    document
      .getElementById('commercial-vendors')
      ?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [shouldReduceMotion])

  return (
    <section className="commercial-hero relative py-6 md:py-12 w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
        className="commercial-hero__grid grid md:grid-cols-12 gap-8 md:gap-10 items-start"
      >
        <div className="commercial-hero__copy md:col-span-7">
          <h1 className="hero-title text-[var(--text-primary)]">
            Private LPG suppliers, by state.
          </h1>

          <p className="type-page-desc mt-4 max-w-[62ch]">
            Browse verified suppliers by state, compare the latest tracked 19kg prices, and contact suppliers directly to confirm rate and stock.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <LiquidGlassBtn onClick={scrollToVendors} className="justify-center">
              Browse suppliers {ARROW}
            </LiquidGlassBtn>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 type-note">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-[var(--status-early)]" />
              Verified before listing
            </span>
            <span className="text-[var(--divider)]" aria-hidden="true">
              {DOT}
            </span>
            <span className="inline-flex items-center gap-2">
              <PhoneCall size={14} className="text-[var(--text-secondary)]" />
              Direct supplier contact
            </span>
          </div>
        </div>

        <div className="commercial-hero__panel md:col-span-5">
          <div className="glass-mid rounded-[var(--radius-lg)] p-6 md:p-7">
            <div className="kicker">
              How this page works
            </div>

            <div className="mt-4 space-y-4 type-card-copy">
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  01
                </span>
                <span>Pick a state to see verified suppliers and the latest tracked 19kg prices.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  02
                </span>
                <span>Review supplier details, service notes, and available contact information.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  03
                </span>
                <span>Confirm rate, stock, and delivery terms directly with the supplier before paying.</span>
              </div>
            </div>

            <div className="mt-6 rounded-md bg-[var(--bg-inset)] border border-[var(--divider)] px-4 py-3 type-note">
              CylinderCheck does not set prices or guarantee stock. Confirm both before paying.
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
