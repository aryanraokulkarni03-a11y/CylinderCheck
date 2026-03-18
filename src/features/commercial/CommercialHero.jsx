// src/features/commercial/CommercialHero.jsx
// Editorial hero (Aigle-inspired): calm, premium, crisis-clear.

import { useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ShieldCheck, PhoneCall } from 'lucide-react'

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
    <section className="relative pt-10 md:pt-16 pb-10 md:pb-14 w-full overflow-hidden">
      {/* Restrained atmospheric wash */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[140px]" />
        <div className="absolute -bottom-56 -left-56 w-[560px] h-[560px] rounded-full bg-[var(--k-terracotta)] opacity-[0.04] blur-[160px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
        className="grid md:grid-cols-12 gap-8 md:gap-10 items-start"
      >
        {/* Left: copy */}
        <div className="md:col-span-7">
          <div className="kicker kicker--caps text-[var(--accent)] mb-4">
            For Business
          </div>

          <h1
            className="hero-title text-[var(--text-primary)]"
          >
            {isWaitlist ? 'Private suppliers are onboarding.' : 'Commercial LPG, without chaos.'}
          </h1>

          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed max-w-[66ch]">
            {isWaitlist
              ? "They'll be here faster than you think. Leave your details and we'll reach out when listings go live in your state."
              : 'Find listed private agencies in your state with active inventory. License checks are rolling out. Always confirm rates and availability directly with the supplier.'}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
            <LiquidGlassBtn onClick={scrollToVendors} className="justify-center">
              {isWaitlist ? 'Join the list' : 'View listed agencies'} {ARROW}
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

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[var(--fs-xs)] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-[var(--status-early)]" />
              License checks rolling out
            </span>
            <span className="text-[var(--divider)]" aria-hidden="true">
              {DOT}
            </span>
            <span className="inline-flex items-center gap-2">
              <PhoneCall size={14} className="text-[var(--text-secondary)]" />
              {isWaitlist ? 'Direct contact once listings go live' : 'Call or WhatsApp directly'}
            </span>
          </div>
        </div>

        {/* Right: the one allowed glass hero surface */}
        <div className="md:col-span-5">
          <div className="glass-mid rounded-[var(--radius-lg)] p-6 md:p-7">
            <div className="kicker kicker--caps">
              How it works
            </div>

            <div className="mt-4 space-y-4 text-[var(--fs-sm)] text-[var(--text-secondary)] leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  01
                </span>
                <span>{isWaitlist ? 'Pick your state and join the onboarding list.' : 'Pick your state and browse listed agencies.'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  02
                </span>
                <span>{isWaitlist ? 'We will reach out when listings go live in your area.' : 'Contact suppliers directly to confirm rates and stock.'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]">
                  03
                </span>
                <span>{isWaitlist ? 'Then contact suppliers directly to confirm rates and stock.' : 'Request quotes if you need emergency matching.'}</span>
              </div>
            </div>

            <div className="mt-6 rounded-md bg-[var(--bg-inset)] border border-[var(--divider)] px-4 py-3 text-[var(--fs-xs)] text-[var(--text-muted)]">
              We do not set prices or guarantee availability. Always verify before paying.
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
