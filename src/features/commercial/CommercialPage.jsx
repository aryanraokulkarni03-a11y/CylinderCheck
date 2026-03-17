// src/features/commercial/CommercialPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { StaggerContainer } from '../../components/motion/StaggerContainer'
import { PageHeader } from '../../components/ui/PageHeader'
import { PillRow } from '../../components/ui/PillRow'
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
  const [hasAnyVendors, setHasAnyVendors] = useState(false)

  useEffect(() => {
    const st = commercialStateForCity(prefilledCity)
    if (st && COMMERCIAL_STATES.includes(st)) setActiveState(st)
  }, [prefilledCity])

  useEffect(() => {
    let alive = true

    async function checkAny() {
      try {
        const nowIso = new Date().toISOString()
        const { data, error } = await supabase
          .from('vendors')
          .select('id')
          .eq('active', true)
          .eq('verification_status', 'verified')
          .or(`listing_expires_at.is.null,listing_expires_at.gt.${nowIso}`)
          .limit(1)

        if (!alive) return
        if (error) return
        setHasAnyVendors((Array.isArray(data) ? data : []).length > 0)
      } catch {
        // Non-blocking: keep as unknown.
      }
    }

    checkAny()
    return () => {
      alive = false
    }
  }, [])

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
      .eq('verification_status', 'verified')
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
    if (clean.length > 0) setHasAnyVendors(true)
    setVendorsLoading(false)
  }, [])

  useEffect(() => {
    fetchVendors(activeState)
  }, [activeState, fetchVendors])

  return (
    <div className="pb-24 w-full min-w-0">
      <CommercialHero hasAnyVendors={hasAnyVendors} />

      <div id="commercial-vendors" className="mt-14 md:mt-20 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12 py-6 border-y border-[var(--border)] bg-[var(--bg-inset)] overline text-[var(--text-muted)] w-full">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--status-early)]" />
            License checks rolling out
          </span>
          <span className="hidden sm:inline text-[var(--divider)]" aria-hidden="true">
            {DOT}
          </span>
          <span className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--text-secondary)]" />
            No middlemen
          </span>
        </div>

        <PageHeader
          as="h2"
          markerStatus="active"
          markerLabel="Commercial Alternatives"
          markerSublabel="Private suppliers"
          title="Private suppliers"
          description="Choose your state to see listings as they go live. If your state is empty today, join the list and we will notify you."
        />

        <PillRow
          ariaLabel="Choose a state"
          value={activeState}
          onChange={setActiveState}
          items={COMMERCIAL_STATES.map((st) => ({ value: st, label: st }))}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-start w-full mt-8 min-w-0">
          <div className="lg:col-span-7 xl:col-span-8 w-full min-w-0">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="font-display font-bold text-[var(--fs-body-lg)] text-[var(--text-primary)]">
                  Listings in {activeState}
                </div>
                <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
                  {vendorsLoading ? '\u2026' : (vendors.length > 0 ? `${vendors.length}` : 'Soon')}
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
                  <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] mb-3">{vendorError}</p>
                  <button
                    type="button"
                    onClick={() => fetchVendors(activeState)}
                    className="text-[var(--fs-sm)] font-medium text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors"
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
                  <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] mb-2">
                    They'll be here faster than you think.
                  </p>
                  <p className="overline text-[var(--text-muted)]">
                    Verified listings for {activeState} are onboarding now.
                  </p>
                  <p className="text-[var(--fs-xs)] text-[var(--text-secondary)] mt-4">
                    Drop your details on the right and we'll reach out as soon as agencies go live.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {vendors.length > 0 && (
              <div className="mt-8 p-4 rounded-md bg-[var(--bg-inset)] border border-[var(--divider)] flex gap-3 text-[var(--fs-xs)] text-[var(--text-muted)]">
                <FileText size={14} className="shrink-0 text-[var(--text-secondary)] mt-0.5" />
                <p className="m-0">
                  CylinderCheck does not guarantee stock availability or set prices. Always confirm rates directly with
                  the agency.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[calc(var(--topbar-height)+32px)] w-full min-w-0">
            <LeadForm selectedState={activeState} vendorsCount={vendors.length} vendorsLoading={vendorsLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
