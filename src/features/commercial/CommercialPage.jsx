// src/features/commercial/CommercialPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FileText, RefreshCw, Store } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { StaggerContainer } from '../../components/motion/StaggerContainer'
import { PageHeader } from '../../components/ui/PageHeader'
import { PillRow } from '../../components/ui/PillRow'
import {
  LPG_PRODUCT_LABELS,
  COMMERCIAL_CITIES_BY_STATE,
  COMMERCIAL_STATES,
  commercialStateForCity,
} from '../../lib/utils'
import { springs } from '../../lib/springs'
import CommercialHero from './CommercialHero'
import VendorCard from './VendorCard'
import LeadForm from './LeadForm'
import { Card } from '../../components/ui/Card'
import { Callout } from '../../components/ui/Callout'
import EmptyState from '../../components/shared/EmptyState'
import { PriceTicker } from '../../components/shared/PriceTicker'

const ARROW = '\u2192'
const RUPEE = '\u20B9'

function isTestVendor(v) {
  const hay = `${v?.name || ''} ${v?.tagline || ''} ${v?.description || ''}`.toLowerCase()
  if (!hay) return false

  // Obvious test artifacts we do not want to ship in the commercial list.
  const needles = ['test', 'demo', 'sample', 'dummy', 'asdf', 'lorem', 'ipsum']
  if (needles.some((n) => hay.includes(n))) return true

  return false
}

function formatPricesUpdated(value) {
  if (!value) return ''

  try {
    const date = new Date(value)
    const diff = Date.now() - date.getTime()
    const mins = Math.max(0, Math.round(diff / 60000))
    if (mins < 60) return `Updated ${mins}m ago`

    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `Updated ${hrs}h ago`

    return `Updated ${date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return ''
  }
}

function getPricesFreshness(value) {
  if (!value) return { label: '', isStale: false }

  try {
    const date = new Date(value)
    const diff = Date.now() - date.getTime()
    const hours = diff / 3600000

    if (hours >= 24) {
      const roundedDays = Math.max(1, Math.round(hours / 24))
      return {
        label: `Last trusted update ${roundedDays}d ago`,
        isStale: true,
      }
    }

    return {
      label: formatPricesUpdated(value),
      isStale: false,
    }
  } catch {
    return { label: '', isStale: false }
  }
}

export default function CommercialPage({ prefilledCity, mapPrices = {}, pricesUpdatedAt = null, productType }) {
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

  const commercialPriceRows = useMemo(
    () =>
      Object.entries(mapPrices).flatMap(([city, products]) => {
        const entry = products?.[productType]
        const price = Number(entry?.price)
        if (!Number.isFinite(price)) return []
        return [{
          city,
          state: entry?.state || '',
          price,
        }]
      }),
    [mapPrices, productType],
  )

  const lowestCommercial = useMemo(
    () =>
      commercialPriceRows.length
        ? commercialPriceRows.reduce((best, current) => (current.price < best.price ? current : best))
        : null,
    [commercialPriceRows],
  )

  const activeStateCommercial = useMemo(
    () => commercialPriceRows.filter((row) => row.state === activeState),
    [activeState, commercialPriceRows],
  )

  const lowestInActiveState = useMemo(
    () =>
      activeStateCommercial.length
        ? activeStateCommercial.reduce((best, current) => (current.price < best.price ? current : best))
        : null,
    [activeStateCommercial],
  )

  const pricesFreshness = useMemo(() => getPricesFreshness(pricesUpdatedAt), [pricesUpdatedAt])

  return (
    <div className="pb-24 w-full min-w-0">
      <CommercialHero hasAnyVendors={hasAnyVendors} />

      <div id="commercial-vendors" className="mt-8 md:mt-10 w-full">
        <PageHeader
          as="h2"
          markerStatus="active"
          markerLabel="Commercial Alternatives"
          markerSublabel="Private suppliers"
          icon={Store}
          title="Private suppliers"
          description="Choose your state to see listings as they go live. If your state is empty today, join the list and we will notify you."
        />
      </div>

      <section
        className={`commercial-market-band mt-8${pricesFreshness.isStale ? ' commercial-market-band--stale' : ''}`}
        aria-label="Commercial LPG market snapshot"
      >
        <div className="commercial-market-band__eyebrow kicker">Commercial LPG snapshot</div>
        <PriceTicker
          mapPrices={mapPrices}
          productType={productType}
          ariaLabel="Commercial LPG prices ticker"
          className="commercial-market-band__ticker"
        />
        <div className="commercial-market-band__meta">
          <div className="commercial-market-band__details">
            <p className="type-note mb-0 commercial-market-band__summary">
              {lowestCommercial
                ? `Lowest tracked 19kg refill today: ${RUPEE}${lowestCommercial.price} in ${lowestCommercial.city}${lowestCommercial.state ? `, ${lowestCommercial.state}` : ''}`
                : `${LPG_PRODUCT_LABELS[productType]} prices will appear here after the next trusted scrape.`}
            </p>
            {lowestInActiveState ? (
              <p className="kicker commercial-market-band__state-note">
                In {activeState}: {lowestInActiveState.city} {RUPEE}
                {lowestInActiveState.price}
              </p>
            ) : null}
            <p className="kicker commercial-market-band__trust">
              Tracked from published city LPG rates. Confirm final dealer quote before ordering.
            </p>
          </div>
          {pricesFreshness.label ? (
            <span
              className={`type-note commercial-market-band__updated${pricesFreshness.isStale ? ' commercial-market-band__updated--stale' : ''}`}
            >
              {pricesFreshness.label}
            </span>
          ) : null}
        </div>
      </section>

      <div className="mt-8 md:mt-10 w-full">
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
                <div className="type-list-title">
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
                    <Card
                      key={i}
                      variant="inset"
                      className="h-44 motion-safe:animate-pulse opacity-60"
                    >
                      <div className="kicker mb-3">Loading supplier</div>
                      <div className="h-5 w-2/5 rounded bg-[var(--bg-raised)] mb-4" />
                      <div className="h-3 w-4/5 rounded bg-[var(--bg-raised)] mb-2" />
                      <div className="h-3 w-3/5 rounded bg-[var(--bg-raised)] mb-6" />
                      <div className="flex gap-3 mt-auto">
                        <div className="h-11 flex-1 rounded-[var(--radius-md)] bg-[var(--bg-raised)]" />
                        <div className="h-11 w-24 rounded-[var(--radius-md)] bg-[var(--bg-raised)]" />
                      </div>
                    </Card>
                  ))}
                </motion.div>
              ) : vendorError ? (
                <Callout
                  as={motion.div}
                  tone="active"
                  key="error"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  className="callout--roomy text-center"
                  edge={false}
                >
                  <p className="type-card-copy mb-3">{vendorError}</p>
                  <button
                    type="button"
                    onClick={() => fetchVendors(activeState)}
                    className="type-nav text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors"
                  >
                    Try again {ARROW}
                  </button>
                </Callout>
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
                >
                  <EmptyState
                    title="They'll be here faster than you think."
                    description={`Verified listings for ${activeState} are onboarding now. Drop your details on the right and we will reach out as soon as agencies go live.`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {vendors.length > 0 && (
              <Card variant="inset" size="compact" className="mt-8 flex gap-3 type-note">
                <FileText size={14} className="shrink-0 text-[var(--text-secondary)] mt-0.5" />
                <p className="m-0">
                  CylinderCheck does not guarantee stock availability or set prices. Always confirm rates directly with
                  the agency.
                </p>
              </Card>
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
