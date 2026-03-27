import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronDown, MapPin, Building2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import EmptyState from '../../components/shared/EmptyState'
import VendorCard from './VendorCard'
import { supabase } from '../../supabaseClient'
import {
  COMMERCIAL_SEO_CITIES,
  LPG_PRODUCT_TYPES,
  commercialStateForCity,
  resolveCommercialSeoCitySlug,
} from '../../lib/utils'
import { springs } from '../../lib/springs'

const ARROW = '\u2192'
const RUPEE = '\u20B9'
const RELATED_COMMERCIAL_CITY_LIMIT = 5
const COMMERCIAL_CITY_GROUPS = {
  Bangalore: ['Hyderabad', 'Chennai', 'Pune', 'Mumbai', 'Delhi'],
  Mumbai: ['Pune', 'Ahmedabad', 'Surat', 'Delhi', 'Bangalore'],
  Delhi: ['Mumbai', 'Kolkata', 'Hyderabad', 'Pune', 'Bangalore'],
  Pune: ['Mumbai', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Surat'],
  Hyderabad: ['Bangalore', 'Chennai', 'Pune', 'Mumbai', 'Delhi'],
  Chennai: ['Bangalore', 'Hyderabad', 'Kolkata', 'Mumbai', 'Delhi'],
  Kolkata: ['Delhi', 'Chennai', 'Hyderabad', 'Mumbai', 'Bangalore'],
  Ahmedabad: ['Surat', 'Mumbai', 'Pune', 'Delhi', 'Bangalore'],
  Surat: ['Ahmedabad', 'Mumbai', 'Pune', 'Delhi', 'Bangalore'],
}

function isTestVendor(vendor) {
  const haystack = `${vendor?.name || ''} ${vendor?.tagline || ''} ${vendor?.description || ''}`.toLowerCase()
  if (!haystack) return false

  return ['test', 'demo', 'sample', 'dummy', 'asdf', 'lorem', 'ipsum'].some((needle) =>
    haystack.includes(needle),
  )
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

function buildCommercialOutlook({ cityName, stateLabel, hasPrice, vendorsCount, isStale }) {
  if (hasPrice && vendorsCount > 0) {
    return `${cityName}${stateLabel ? `, ${stateLabel}` : ''} already reads like a usable business market page. Start with the tracked 19kg city reference, then move into supplier outreach once you know the market range you want to validate.`
  }

  if (hasPrice) {
    return `${cityName}${stateLabel ? `, ${stateLabel}` : ''} currently works best as a tracked 19kg market reference page. The supplier layer is lighter here, so use the city price first and then broaden out to the business directory for live stock and delivery conversations.`
  }

  if (vendorsCount > 0) {
    return `${cityName}${stateLabel ? `, ${stateLabel}` : ''} has supplier coverage even while the tracked 19kg city reference is still catching up. This page is most useful as a business routing layer: shortlist suppliers here, then confirm rate and delivery directly.`
  }

  if (isStale) {
    return `${cityName}${stateLabel ? `, ${stateLabel}` : ''} is still a thinner commercial market page right now. The tracked read is aging, so the best next step is to browse the broader supplier directory and confirm the live business quote before you place an order.`
  }

  return `${cityName}${stateLabel ? `, ${stateLabel}` : ''} is still building out as a commercial LPG landing page. Use it for the broad market read first, then rely on the business directory once you need supplier availability, delivery reach, and terms.`
}

function buildCommercialFaqs({ cityName, hasPrice, vendorsCount }) {
  const priceLine = hasPrice
    ? `CylinderCheck is currently tracking a 19kg commercial LPG city reference for ${cityName}, which helps anchor the market read before you start calling suppliers.`
    : `CylinderCheck is still checking for the latest trusted 19kg city reference in ${cityName}, so this page works more as a supplier-discovery and planning layer until the next commercial price update lands.`

  const supplierLine = vendorsCount > 0
    ? `${cityName} also has verified supplier coverage here, which means you can move from the tracked city read into actual supplier outreach without leaving the CylinderCheck commercial path.`
    : `${cityName} does not have deep verified supplier coverage yet inside this page, so the next step is to use the broader commercial directory if you need current availability and quotes.`

  return [
    {
      question: `What is the commercial LPG price in ${cityName} today?`,
      answer: `${priceLine} Final per-cylinder quotes, taxes, stock, and delivery terms still come from the supplier.`,
    },
    {
      question: `How should a business use the ${cityName} commercial LPG page?`,
      answer: `Use the ${cityName} page to get the tracked 19kg market read first, then move into supplier discovery when you need to confirm live stock, delivery timing, and account terms. ${supplierLine}`,
    },
    {
      question: `Are ${cityName} commercial LPG city rates the same as a final supplier quote?`,
      answer: `No. CylinderCheck shows tracked city-level commercial LPG references for ${cityName}. Your final quote still depends on the supplier, delivery reach, taxes, and your order requirements.`,
    },
    {
      question: `When should I browse suppliers instead of relying only on the ${cityName} commercial page?`,
      answer: `Browse suppliers as soon as you need current stock, delivery reach, credit terms, or a quote for your exact restaurant, hotel, catering, or kitchen requirement in ${cityName}.`,
    },
  ]
}

function pickRelatedCommercialCities(currentCity) {
  const priorityMap = new Map(
    COMMERCIAL_SEO_CITIES.map((city, index) => [city.toLowerCase(), index]),
  )
  const preferredCities = COMMERCIAL_CITY_GROUPS[currentCity] || []
  const seen = new Set([currentCity.toLowerCase()])
  const ordered = []

  for (const city of preferredCities) {
    const key = city.toLowerCase()
    if (seen.has(key) || !priorityMap.has(key)) continue
    seen.add(key)
    ordered.push(city)
  }

  const fallbackCities = COMMERCIAL_SEO_CITIES
    .filter((city) => !seen.has(city.toLowerCase()))
    .sort(
      (a, b) =>
        (priorityMap.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
        (priorityMap.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER),
    )

  for (const city of fallbackCities) {
    if (ordered.length >= RELATED_COMMERCIAL_CITY_LIMIT) break
    ordered.push(city)
  }

  return ordered.slice(0, RELATED_COMMERCIAL_CITY_LIMIT).map((city) => ({
    city,
    slug: city.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  }))
}

export default function CommercialCitySEOPage({
  mapPrices = {},
  pricesUpdatedAt = null,
  productType = LPG_PRODUCT_TYPES.commercial_19kg,
}) {
  const params = useParams()
  const rawRouteSlug = params.citySlug || params.cityPageSlug || params['*'] || ''
  const citySlug = rawRouteSlug.startsWith('commercial-lpg-price-in-')
    ? rawRouteSlug.slice('commercial-lpg-price-in-'.length)
    : rawRouteSlug
  const commercialCity = resolveCommercialSeoCitySlug(citySlug)

  if (!commercialCity) {
    return <Navigate to="/business" replace />
  }

  const normalizedCity = commercialCity.cityName
  const stateLabel = commercialStateForCity(normalizedCity)

  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorError, setVendorError] = useState('')

  useEffect(() => {
    let active = true

    async function fetchVendors() {
      setVendorsLoading(true)
      setVendorError('')

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('city', normalizedCity)
        .eq('active', true)
        .eq('verification_status', 'verified')
        .or(`listing_expires_at.is.null,listing_expires_at.gt.${new Date().toISOString()}`)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: true })

      if (!active) return

      if (error) {
        setVendorError('Could not load commercial suppliers for this city yet. Please try again.')
        setVendors([])
        setVendorsLoading(false)
        return
      }

      setVendors((Array.isArray(data) ? data : []).filter((vendor) => !isTestVendor(vendor)))
      setVendorsLoading(false)
    }

    fetchVendors()
    return () => {
      active = false
    }
  }, [normalizedCity])

  const priceEntry = mapPrices?.[normalizedCity]?.[productType] || null
  const trackedPrice = Number(priceEntry?.price)
  const hasTrackedPrice = Number.isFinite(trackedPrice)
  const cityPriceRecordedAt = priceEntry?.recordedAt || priceEntry?.recorded_at || null
  const pricesFreshness = useMemo(() => getPricesFreshness(cityPriceRecordedAt), [cityPriceRecordedAt])
  const relatedCities = useMemo(() => pickRelatedCommercialCities(normalizedCity), [normalizedCity])
  const commercialFaqs = useMemo(
    () =>
      buildCommercialFaqs({
        cityName: normalizedCity,
        hasPrice: hasTrackedPrice,
        vendorsCount: vendors.length,
      }),
    [hasTrackedPrice, normalizedCity, vendors.length],
  )
  const commercialOutlook = useMemo(
    () =>
      buildCommercialOutlook({
        cityName: normalizedCity,
        stateLabel,
        hasPrice: hasTrackedPrice,
        vendorsCount: vendors.length,
        isStale: pricesFreshness.isStale,
      }),
    [hasTrackedPrice, normalizedCity, pricesFreshness.isStale, stateLabel, vendors.length],
  )
  const planningCards = useMemo(
    () => [
      {
        title: 'Tracked 19kg read',
        value: hasTrackedPrice ? `${RUPEE}${trackedPrice}` : 'Waiting for trusted city rate',
        body: hasTrackedPrice
          ? `CylinderCheck is holding a commercial city reference for ${normalizedCity}, which gives your team a cleaner number before supplier calls begin.`
          : `This city still needs a fresher tracked 19kg read, so treat the page as a commercial planning and supplier-discovery layer for now.`,
      },
      {
        title: 'Supplier coverage',
        value: vendors.length > 0 ? `${vendors.length} verified supplier${vendors.length === 1 ? '' : 's'}` : 'Use the broader directory',
        body: vendors.length > 0
          ? `Verified supplier listings help you move from the city market read into actual outreach without leaving the commercial flow.`
          : `If the city-level supplier layer stays thin, the broader business directory is still the safer next step for stock and delivery checks.`,
      },
      {
        title: 'Best next move',
        value: vendors.length > 0 ? 'Shortlist, then confirm live quotes' : 'Use the market read, then open suppliers',
        body: stateLabel
          ? `This page keeps ${normalizedCity}, ${stateLabel} practical: read the market first, then confirm the final number with a supplier who serves your business area.`
          : `This page stays useful by separating the tracked city read from the real supplier conversation you still need before placing a business order.`,
      },
    ],
    [hasTrackedPrice, normalizedCity, stateLabel, trackedPrice, vendors.length],
  )
  const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(),
  )
  const title = `Commercial LPG Price in ${normalizedCity} Today \u2014 ${monthYear}`

  return (
    <div className="page-root pb-12 commercial-city-page">
      <PageHeader
        markerLabel="Commercial 19kg"
        markerSublabel={stateLabel || 'Tracked business market'}
        title={title}
        description={`Check the tracked 19kg commercial LPG price in ${normalizedCity}, browse suppliers, and compare the city market read before you call for a business refill.`}
      />

      <div className="page-grid-dual commercial-city-page__hero-grid">
        <motion.div variants={springs.item} initial="hidden" animate="visible" className="h-full">
          <Card variant="inset" className="commercial-city-page__hero-card card--utility-tight">
            <CardHeader title="Tracked commercial market read" titleAs="h2">
              <p className="card-header__description type-card-copy mb-0">
                Start with the city-level 19kg reference first, then move into supplier outreach once you know the market range you are validating.
              </p>
            </CardHeader>
            <CardBody className="commercial-city-page__hero-body">
              <div className="commercial-city-rate-card">
                <div className="commercial-city-rate-card__top">
                  <span className="badge commercial-city-rate-card__badge">
                    <Sparkles size={14} aria-hidden="true" />
                    19kg business read
                  </span>
                  {stateLabel ? (
                    <span className="type-meta commercial-city-rate-card__state">
                      <MapPin size={14} aria-hidden="true" />
                      {stateLabel}
                    </span>
                  ) : null}
                </div>
                <div className="commercial-city-rate-card__value">
                  {hasTrackedPrice ? `${RUPEE}${trackedPrice}` : 'Waiting for trusted city rate'}
                </div>
                <p className="type-note mb-0 commercial-city-rate-card__copy">
                  {hasTrackedPrice
                    ? `Tracked commercial LPG reference for ${normalizedCity}. Final stock, taxes, and delivery still come from the supplier.`
                    : `CylinderCheck is still waiting for a fresher city-level 19kg read in ${normalizedCity}. Use the broader supplier flow if you need a quote today.`}
                </p>

                <div className="commercial-city-rate-card__facts">
                  <div className="commercial-city-rate-card__fact">
                    <span className="type-card-title">Supplier listings</span>
                    <span className="type-note">{vendorsLoading ? 'Checking...' : vendors.length > 0 ? `${vendors.length} verified` : 'Building out'}</span>
                  </div>
                  <div className="commercial-city-rate-card__fact">
                    <span className="type-card-title">Freshness</span>
                    <span className={`type-note${pricesFreshness.isStale ? ' commercial-city-rate-card__fact-copy--stale' : ''}`}>
                      {pricesFreshness.label || 'Awaiting refresh'}
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={springs.item} initial="hidden" animate="visible" className="h-full">
          <Card className="commercial-city-page__action-card card--utility-tight">
            <CardHeader title={`How commercial buyers should use ${normalizedCity}`} titleAs="h2" />
            <CardBody className="commercial-city-page__action-body">
              <p className="type-card-copy mb-0">{commercialOutlook}</p>
              <div className="commercial-city-page__action-list">
                <div className="commercial-city-page__action-item">
                  <span className="badge">01</span>
                  <span>Read the tracked 19kg city range before you start comparing supplier quotes.</span>
                </div>
                <div className="commercial-city-page__action-item">
                  <span className="badge">02</span>
                  <span>Check supplier availability, delivery reach, and account terms for your exact business need.</span>
                </div>
                <div className="commercial-city-page__action-item">
                  <span className="badge">03</span>
                  <span>Confirm the final per-cylinder number directly with the supplier before you place the order.</span>
                </div>
              </div>
              <div className="commercial-city-page__action-links">
                <Link to="/business" className="glass-btn justify-center">
                  Browse suppliers {ARROW}
                </Link>
                <Link to="/cities" className="btn-ghost w-full justify-center">
                  Compare household city pages {ARROW}
                </Link>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      <section className="page-section commercial-city-summary">
        <Card variant="inset" className="commercial-city-summary__card card--utility-tight">
          <CardHeader title={`How to read ${normalizedCity} for business use right now`} titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">{commercialOutlook}</p>
          </CardHeader>
          <CardBody className="commercial-city-summary__body">
            <div className="commercial-city-summary__grid">
              {planningCards.map((item) => (
                <article key={item.title} className="commercial-city-summary-card">
                  <p className="type-card-title mb-1">{item.title}</p>
                  <div className="commercial-city-summary-card__value">{item.value}</div>
                  <p className="type-note mb-0">{item.body}</p>
                </article>
              ))}
            </div>

            <Callout tone="clear" edge={false} className="commercial-city-summary__callout">
              <p className="type-note mb-0">
                CylinderCheck keeps the commercial page practical: tracked city price first, supplier discovery second, final quote confirmation last.
              </p>
            </Callout>
          </CardBody>
        </Card>
      </section>

      <section className="page-section commercial-city-vendors" id="commercial-city-suppliers">
        <Card variant="inset" className="commercial-city-vendors__card card--utility-tight">
          <CardHeader title={`Verified suppliers in and around ${normalizedCity}`} titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              Use these listings to move from the tracked city read into real supplier conversations about stock, delivery reach, and payment terms.
            </p>
          </CardHeader>
          <CardBody className="commercial-city-vendors__body">
            {vendorsLoading ? (
              <div className="commercial-city-vendors__skeletons" aria-hidden="true">
                {[1, 2].map((item) => (
                  <Card key={item} variant="inset" className="commercial-city-vendors__skeleton" />
                ))}
              </div>
            ) : vendorError ? (
              <Callout tone="active" edge={false}>
                <p className="type-card-copy mb-3">{vendorError}</p>
                <Link to="/business" className="type-inline-link">
                  Browse the wider supplier directory {ARROW}
                </Link>
              </Callout>
            ) : vendors.length > 0 ? (
              <div className="commercial-city-vendors__list">
                {vendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Verified city suppliers are still building here"
                description={`CylinderCheck does not have a strong verified supplier layer for ${normalizedCity} yet. Use the broader business directory while this city-specific coverage grows.`}
                iconSlot={<Building2 size={28} />}
              />
            )}
          </CardBody>
        </Card>
      </section>

      <section className="page-section commercial-city-related">
        <Card variant="inset" className="commercial-city-related__card card--utility-tight">
          <CardHeader title="Browse other tracked commercial city markets" titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              Compare other business markets with dedicated 19kg pages before you settle on the city cluster you want to monitor more closely.
            </p>
          </CardHeader>
          <CardBody className="commercial-city-related__body">
            <div className="commercial-city-related__grid">
              {relatedCities.map(({ city, slug }) => (
                <Link
                  key={slug}
                  to={`/commercial-lpg-price-in-${slug}`}
                  className="commercial-city-related__link"
                >
                  <span className="type-card-title">{city}</span>
                  <span className="type-note">Tracked 19kg market read and suppliers {ARROW}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="page-section commercial-city-faq">
        <Card variant="inset" className="commercial-city-faq__card card--utility-tight">
          <CardHeader title={`Questions businesses have before checking commercial LPG in ${normalizedCity}`} titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              These answers keep the page practical: what the tracked 19kg number means, when supplier discovery matters, and how to use CylinderCheck without over-reading one city price.
            </p>
          </CardHeader>
          <CardBody className="commercial-city-faq__body">
            <div className="commercial-city-faq__list">
              {commercialFaqs.map((item, index) => (
                <details key={item.question} className="commercial-city-faq__item" open={index === 0}>
                  <summary className="commercial-city-faq__summary">
                    <span className="type-card-title">{item.question}</span>
                    <ChevronDown className="commercial-city-faq__caret" aria-hidden="true" />
                  </summary>
                  <div className="commercial-city-faq__answer">
                    <p className="type-note mb-0">{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
