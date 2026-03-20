// src/features/commercial/CommercialHero.jsx
// Editorial hero (Aigle-inspired): calm, premium, crisis-clear.

import { useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ShieldCheck, PhoneCall, Store } from 'lucide-react'

import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { springs } from '../../lib/springs'

const DOT = '\u00B7'
const ARROW = '\u2192'

export default function CommercialHero({ hasAnyVendors = null }) {
  const shouldReduceMotion = useReducedMotion()
  const isWaitlist = hasAnyVendors === false

  const scrollToVendors = useCallback(() => {
    document
      .getElementById('commercial-vendors')
      ?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [shouldReduceMotion])

  return (
    <section className="commercial-hero relative pt-10 md:pt-16 pb-10 md:pb-14 w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
        className="commercial-hero__grid grid md:grid-cols-12 gap-8 md:gap-10 items-start"
      >
        {/* Left: copy */}
        <div className="commercial-hero__copy md:col-span-7">
          <div className="kicker text-[var(--accent)] mb-4">
            For Business
          </div>

          <h1 className="hero-title text-[var(--text-primary)]">
            <span className="page-header__title-row">
              <Store size={30} className="text-[var(--accent)]" aria-hidden="true" />
              <span>{isWaitlist ? 'Private LPG suppliers are being added.' : 'Private LPG suppliers, state by state.'}</span>
            </span>
          </h1>

          <p className="type-page-desc mt-4 max-w-[62ch]">
            {isWaitlist
              ? 'Leave your details. We will contact you when verified suppliers open in your state.'
              : 'See listed private suppliers in your state and contact them directly for rates and stock.'}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
            <LiquidGlassBtn onClick={scrollToVendors} className="justify-center">
              {isWaitlist ? 'Join waitlist' : 'See suppliers'} {ARROW}
            </LiquidGlassBtn>
            <button
              type="button"
              onClick={scrollToVendors}
              className="btn-ghost justify-center"
            >
              {isWaitlist ? 'Leave details' : 'Request quotes'}
              <ArrowDownRight size={18} />
            </button>
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

        {/* Right: the one allowed glass hero surface */}
        <div className="commercial-hero__panel md:col-span-5">
          <div className="glass-mid rounded-[var(--radius-lg)] p-6 md:p-7">
            <div className="kicker">
              What happens next
            </div>

            <div className="mt-4 space-y-4 type-card-copy">
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  01
                </span>
                <span>{isWaitlist ? 'Pick your state and leave your details.' : 'Pick your state and review listed suppliers.'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  02
                </span>
                <span>{isWaitlist ? 'We contact you when verified suppliers open in your area.' : 'Contact suppliers directly to confirm rate and stock.'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  03
                </span>
                <span>{isWaitlist ? 'Confirm rate and stock with the supplier directly.' : 'Leave your details if you want help getting quotes.'}</span>
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
