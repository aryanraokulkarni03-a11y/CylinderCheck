// src/features/commercial/CommercialPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { StaggerContainer } from '../../components/motion/StaggerContainer'
import { SectionMarker } from '../../components/shared/SectionMarker'
import {
  COMMERCIAL_CITIES_BY_STATE,
  COMMERCIAL_STATES,
  commercialStateForCity,
} from '../../lib/utils'
import { springs } from '../../lib/springs'
import CommercialHero from './CommercialHero'
import VendorCard from './VendorCard'
import LeadForm from './LeadForm'

const ARROW = '\u2192'
const DOT = '\u00B7'

function isTestVendor(v) {
  const hay = `${v?.name || ''} ${v?.tagline || ''} ${v?.description || ''}`.toLowerCase()
  if (!hay) return false

  // Obvious test artifacts we do not want to ship in the commercial list.
  const needles = ['test', 'demo', 'sample', 'dummy', 'asdf', 'lorem', 'ipsum']
  if (needles.some((n) => hay.includes(n))) return true

  return false
}

export default function CommercialPage({ prefilledCity }) {
  const shouldReduceMotion = useReducedMotion()

  const defaultState = useMemo(() => {
    const st = commercialStateForCity(prefilledCity)
    return st && COMMERCIAL_STATES.includes(st) ? st : COMMERCIAL_STATES[0]
  }, [prefilledCity])

  const [activeState, setActiveState] = useState(defaultState)
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorError, setVendorError] = useState(null)

  useEffect(() => {
    const st = commercialStateForCity(prefilledCity)
    if (st && COMMERCIAL_STATES.includes(st)) setActiveState(st)
  }, [prefilledCity])

  const fetchVendors = useCallback(async (stateName) => {
    setVendorsLoading(true)
    setVendorError(null)

    const cities = COMMERCIAL_CITIES_BY_STATE[stateName] || []
    if (!cities.length) {
      setVendors([])
      setVendorsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .in('city', cities)
      .eq('active', true)
      .or(`listing_expires_at.is.null,listing_expires_at.gt.${new Date().toISOString()}`)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      setVendorError('Could not load suppliers. Please try again.')
      setVendors([])
      setVendorsLoading(false)
      return
    }

    const clean = (Array.isArray(data) ? data : []).filter((v) => !isTestVendor(v))
    setVendors(clean)
    setVendorsLoading(false)
  }, [])

  useEffect(() => {
    fetchVendors(activeState)
  }, [activeState, fetchVendors])

  return (
    <div className="pb-24 w-full">
      <CommercialHero />

      <div id="commercial-vendors" className="mt-14 md:mt-20 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12 py-6 border-y border-[var(--border)] bg-[var(--bg-inset)] text-[12px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)] w-full">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--status-early)]" />
            License checks rolling out
          </span>
          <span className="hidden sm:inline text-[var(--divider)]" aria-hidden="true">
            {DOT}
          </span>
          <span className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--text-secondary)]" />
            Contact agencies directly
          </span>
        </div>

        <SectionMarker status="active" label="Commercial Alternatives" sublabel="Private suppliers" />

        <h1
          className="font-display font-extrabold text-[clamp(24px,4vw,36px)]
                     tracking-[-0.03em] text-[var(--text-primary)]
                     mb-2 leading-[1.1]"
        >
          Private suppliers
        </h1>
        <p className="text-[var(--text-secondary)] text-[15px] mb-8 max-w-[640px]">
          Choose your state to view listed agencies with active inventory. Always confirm availability and rates.
        </p>

        <div className="flex items-center overflow-x-auto gap-2 pb-3 -mx-2 px-2">
          {COMMERCIAL_STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveState(st)}
              className={`shrink-0 px-5 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors border ${
                activeState === st
                  ? 'bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)]'
                  : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-start w-full mt-8">
          <div className="lg:col-span-7 xl:col-span-8 w-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="font-display font-bold text-[18px] text-[var(--text-primary)]">
                  Agencies in {activeState}
                </div>
                <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
                  {vendorsLoading ? '\u2026' : `${vendors.length}`}
                </span>
              </div>

              {!vendorsLoading && (
                <button
                  type="button"
                  onClick={() => fetchVendors(activeState)}
                  aria-label="Refresh"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {vendorsLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="space-y-4"
                >
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-44 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] motion-safe:animate-pulse opacity-60"
                    />
                  ))}
                </motion.div>
              ) : vendorError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="rounded-lg border border-[var(--status-active-border)] bg-[var(--status-active-soft)] p-8 text-center"
                >
                  <p className="text-[14px] text-[var(--text-secondary)] mb-3">{vendorError}</p>
                  <button
                    type="button"
                    onClick={() => fetchVendors(activeState)}
                    className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors"
                  >
                    Try again {ARROW}
                  </button>
                </motion.div>
              ) : vendors.length > 0 ? (
                <StaggerContainer key={activeState} className="flex flex-col gap-6 w-full">
                  {vendors.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} />
                  ))}
                </StaggerContainer>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-inset)] p-12 text-center w-full"
                >
                  <svg
                    width="48"
                    height="60"
                    viewBox="0 0 48 60"
                    fill="none"
                    className="mx-auto mb-4 opacity-25"
                  >
                    <ellipse cx="24" cy="9" rx="18" ry="6" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                    <line x1="6" y1="9" x2="6" y2="47" stroke="var(--accent)" strokeWidth="1.5" />
                    <line x1="42" y1="9" x2="42" y2="47" stroke="var(--accent)" strokeWidth="1.5" />
                    <ellipse cx="24" cy="47" rx="18" ry="6" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                    <ellipse cx="24" cy="47" rx="18" ry="6" fill="var(--accent)" opacity="0.10" />
                  </svg>
                  <p className="text-[14px] text-[var(--text-secondary)] mb-2">
                    Coming to {activeState} soon.
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)] font-data uppercase tracking-widest">
                    We are onboarding agencies daily.
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-4">
                    Submit your details on the right and we will match you manually within 24 hours.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {vendors.length > 0 && (
              <div className="mt-8 p-4 rounded-md bg-[var(--bg-inset)] border border-[var(--divider)] flex gap-3 text-[12px] text-[var(--text-muted)]">
                <FileText size={14} className="shrink-0 text-[var(--text-secondary)] mt-0.5" />
                <p className="m-0">
                  CylinderCheck does not guarantee stock availability or set prices. Always confirm rates directly with
                  the agency.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[calc(var(--topbar-height)+32px)] w-full">
            <LeadForm selectedState={activeState} />
          </div>
        </div>
      </div>
    </div>
  )
}
