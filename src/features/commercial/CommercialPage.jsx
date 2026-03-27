// src/features/commercial/CommercialPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { StaggerContainer } from '../../components/motion/StaggerContainer'
import { PillRow } from '../../components/ui/PillRow'
import {
  COMMERCIAL_SEO_CITIES,
  LPG_PRODUCT_LABELS,
  COMMERCIAL_CITIES_BY_STATE,
  COMMERCIAL_STATES,
  commercialStateForCity,
} from '../../lib/utils'
import { springs } from '../../lib/springs'
import CommercialHero from './CommercialHero'
import VendorCard from './VendorCard'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import EmptyState from '../../components/shared/EmptyState'
import { PriceTicker } from '../../components/shared/PriceTicker'

const ARROW = '\u2192'
const RUPEE = '\u20B9'

function isTestVendor(v) {
  const hay = `${v?.name || ''} ${v?.tagline || ''} ${v?.description || ''}`.toLowerCase()
  if (!hay) return false

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

function isSameTrackedPrice(a, b) {
  if (!a || !b) return false
  return a.city === b.city && a.state === b.state && a.price === b.price
}

export default function CommercialPage({ prefilledCity, mapPrices = {}, pricesUpdatedAt = null, productType }) {
  const shouldReduceMotion = useReducedMotion()
  const featuredCommercialCities = useMemo(
    () => COMMERCIAL_SEO_CITIES.slice(0, 5).map((city) => ({
      city,
      slug: city.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })),
    [],
  )

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
    <div className="page-root">
      <CommercialHero />

      <section className="page-section commercial-page-discovery">
        <Card variant="inset" className="commercial-page-discovery__card card--utility-tight">
          <CardHeader title="Commercial city pages worth checking first" titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              Start with a tracked 19kg city market read when you know the city you buy in most often, then come back here to compare suppliers and confirm availability.
            </p>
          </CardHeader>
          <CardBody className="commercial-page-discovery__body">
            <div className="commercial-page-discovery__grid">
              {featuredCommercialCities.map(({ city, slug }) => (
                <Link
                  key={slug}
                  to={`/commercial-lpg-price-in-${slug}`}
                  className="commercial-page-discovery__link"
                >
                  <span className="type-card-title">{city}</span>
                  <span className="type-note">Tracked 19kg market read {ARROW}</span>
                </Link>
              ))}
            </div>

            <Callout tone="clear" edge={false} className="commercial-page-discovery__callout">
              <p className="type-note mb-0">
                These pages separate the city market read from the wider supplier directory so business buyers can move from price context into vendor outreach without mixing household and commercial flows.
              </p>
            </Callout>
          </CardBody>
        </Card>
      </section>

      <section
        id="commercial-vendors"
        className={`commercial-market-band${pricesFreshness.isStale ? ' commercial-market-band--stale' : ''}`}
        aria-label="Commercial LPG market snapshot"
      >
        <PriceTicker
          mapPrices={mapPrices}
          productType={productType}
          ariaLabel="Commercial LPG prices ticker"
          className="commercial-market-band__ticker"
          edgeFadeClassName="commercial-market-band__ticker-edge"
        />
        <div className="commercial-market-band__meta">
          <div className="commercial-market-band__details">
            <p className="type-note mb-0 commercial-market-band__summary">
              {lowestCommercial
                ? `Lowest tracked 19kg refill today: ${RUPEE}${lowestCommercial.price} in ${lowestCommercial.city}${lowestCommercial.state ? `, ${lowestCommercial.state}` : ''}`
                : `${LPG_PRODUCT_LABELS[productType]} prices will appear here after the next trusted scrape.`}
            </p>
            <p className="kicker commercial-market-band__trust">
              {lowestInActiveState && !isSameTrackedPrice(lowestInActiveState, lowestCommercial)
                ? `Lowest in ${activeState}: ${lowestInActiveState.city} ${RUPEE}${lowestInActiveState.price}.`
                : 'Published city LPG rates.'}
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

      <div className="page-section">
        <PillRow
          ariaLabel="Choose a state"
          value={activeState}
          onChange={setActiveState}
          items={COMMERCIAL_STATES.map((st) => ({ value: st, label: st }))}
        />

        <div className="w-full min-w-0">
            <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="type-list-title">
                Listings in {activeState}
                </div>
                <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
                  {vendorsLoading ? '\u2026' : (vendors.length > 0 ? `${vendors.length}` : 'None yet')}
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
                    title="No suppliers listed yet"
                    description={`No verified suppliers are listed in ${activeState} yet. Try another state or check back later.`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
