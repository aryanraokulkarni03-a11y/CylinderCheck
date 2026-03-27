// src/features/seo/CitySEOPage.jsx
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Store, Truck, Clock, ShieldCheck, Activity, Sparkles, ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import { supabase } from '../../supabaseClient'
import { CITY_NORMALISE, LPG_PRODUCT_TYPES } from '../../lib/utils'
import { springs } from '../../lib/springs'
import citiesData from '../../data/cities.json'

const PriceHistoryChart = lazy(() => import('./PriceHistoryChart'))

const ARROW = '\u2192'
const RUPEE = '\u20B9'
const DOMESTIC_PRODUCT = LPG_PRODUCT_TYPES.domestic_14_2kg
const LIVE_FEED_MIN_ROWS = 3
const LIVE_FEED_MIN_ACTIVE_ITEMS = 2
const LIVE_FEED_MAX_ITEMS = 4
const RELATED_CITY_LIMIT = 6
const DISCOVERY_CITY_PRIORITY = [...(citiesData || [])]
const CITY_RELATED_GROUPS = {
  Bangalore: ['Hyderabad', 'Chennai', 'Pune', 'Mumbai'],
  Mumbai: ['Pune', 'Ahmedabad', 'Surat', 'Bangalore'],
  Delhi: ['Gurugram', 'Jaipur', 'Lucknow', 'Mumbai'],
  Pune: ['Mumbai', 'Bangalore', 'Ahmedabad', 'Hyderabad'],
  Hyderabad: ['Bangalore', 'Chennai', 'Pune', 'Mumbai'],
  Chennai: ['Bangalore', 'Hyderabad', 'Kolkata', 'Mumbai'],
  Kolkata: ['Chennai', 'Delhi', 'Hyderabad', 'Mumbai'],
  Ahmedabad: ['Surat', 'Mumbai', 'Pune', 'Delhi'],
  Surat: ['Ahmedabad', 'Mumbai', 'Pune', 'Delhi'],
  Gurugram: ['Delhi', 'Jaipur', 'Lucknow', 'Mumbai'],
}
const SIGNAL_RANK = {
  severe: 4,
  active: 3,
  building: 2,
  low: 1,
  limited: 0,
}

function formatCityNameFromSlug(slug) {
  if (!slug) return 'Your City'
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatAreaLabel(row, fallbackCity) {
  const area = String(row?.area || '').trim()
  if (area) return area

  const city = String(row?.city || '').trim()
  if (city) return city

  return fallbackCity
}

function rankSignalRow(a, b) {
  return (
    (SIGNAL_RANK[String(b?.pressure_level || '').toLowerCase()] || 0) -
      (SIGNAL_RANK[String(a?.pressure_level || '').toLowerCase()] || 0) ||
    (Number(b?.report_count_30d) || 0) - (Number(a?.report_count_30d) || 0) ||
    (Number(b?.pressure_score) || 0) - (Number(a?.pressure_score) || 0) ||
    (Number(b?.delivery_days_median) || 0) - (Number(a?.delivery_days_median) || 0)
  )
}

function hasMeaningfulSignal(row) {
  const reports = Number(row?.report_count_30d) || 0
  const pressureSignals =
    (Number(row?.pressure_exact_signal_count_30d) || 0) +
    (Number(row?.pressure_nearby_signal_count_30d) || 0)
  const deliverySignals =
    (Number(row?.delivery_exact_signal_count_30d) || 0) +
    (Number(row?.delivery_nearby_signal_count_30d) || 0)
  const pressureScope = String(row?.pressure_source_scope || '').toLowerCase()
  const deliveryScope = String(row?.delivery_source_scope || '').toLowerCase()

  return (
    reports > 0 ||
    pressureSignals > 0 ||
    deliverySignals > 0 ||
    ['local', 'mixed'].includes(pressureScope) ||
    ['local', 'mixed'].includes(deliveryScope)
  )
}

function pressureLabel(level) {
  switch (String(level || '').toLowerCase()) {
    case 'severe':
      return 'Pressure is severe'
    case 'active':
      return 'Pressure is active'
    case 'building':
      return 'Pressure is building'
    case 'low':
      return 'Pressure is low'
    default:
      return 'Signals are still building'
  }
}

function buildSignalCopy(row) {
  const reports = Number(row?.report_count_30d) || 0
  const deliveryDays = Number(row?.delivery_days_median)
  const pressure = String(row?.pressure_level || '').toLowerCase()

  if (Number.isFinite(deliveryDays) && deliveryDays >= 7) {
    return `Estimated delivery is stretching toward ${Math.round(deliveryDays)} days, which is beyond a routine refill rhythm.`
  }

  if (Number.isFinite(deliveryDays) && deliveryDays >= 4) {
    return `Estimated delivery is settling around ${Math.round(deliveryDays)} days, so planning earlier is safer here.`
  }

  if (reports >= 4 && ['active', 'severe'].includes(pressure)) {
    return 'Community evidence is stacking up in this pocket, with repeated signs that local supply is under strain.'
  }

  if (reports >= 1 && pressure === 'building') {
    return 'Early local signals suggest this pocket is starting to tighten before the wider city picture fully catches up.'
  }

  if (pressure === 'low' && Number.isFinite(deliveryDays) && deliveryDays > 0) {
    return "Signals still look calmer here, with a steadier delivery window than the city's more strained pockets."
  }

  return 'CylinderCheck is seeing local movement here, enough to keep this area on the live planning radar.'
}

function buildSignalMeta(row) {
  const meta = []
  const reports = Number(row?.report_count_30d) || 0
  const deliveryDays = Number(row?.delivery_days_median)
  const distributor = String(row?.distributor_name || '').trim()

  meta.push(reports > 0 ? `${reports} recent report${reports === 1 ? '' : 's'}` : 'Signal evidence tracked')

  if (Number.isFinite(deliveryDays) && deliveryDays > 0) {
    meta.push(`${Math.round(deliveryDays)} day estimate`)
  }

  if (distributor) {
    meta.push(distributor)
  }

  return meta
}

function describeCityOutlook({ cityName, strongestLevel, showLiveFeed, liveAreaCount }) {
  if (showLiveFeed && strongestLevel === 'severe') {
    return `${cityName} is not reading like one flat LPG market today. A few local pockets are showing sharper pressure than the wider city average, so the city page is most useful as a planning summary before you switch to your PIN.`
  }

  if (showLiveFeed && strongestLevel === 'active') {
    return `${cityName} is showing active local movement rather than a static monthly rate table. The city page gives you the broad read first, then the PIN tracker helps tighten the planning window for your own area.`
  }

  if (showLiveFeed && strongestLevel === 'building') {
    return `${cityName} is starting to show early local tightening in a few pockets. This is usually the point where a city-level summary becomes useful, but the best next move is still a PIN-level check if your booking timing matters.`
  }

  if (liveAreaCount > 0) {
    return `${cityName} has enough live signal coverage to be useful as a city-level planning page, but the signals still look calmer than the more strained cities. Use it as a market read first, then confirm the exact picture by PIN if needed.`
  }

  return `${cityName} currently reads more like a clean city-level LPG reference page than a heavy live-signal page. That still makes it useful for prices, trend context, and deciding when it is worth opening the PIN tracker for a sharper local read.`
}

function buildCityFaqs({ cityName, showLiveFeed, prices, agenciesCount, liveAreaCount }) {
  const domesticLine = prices.domestic
    ? `CylinderCheck is currently tracking a domestic 14.2kg city rate for ${cityName}, which helps anchor the market read before you switch to your local PIN.`
    : `CylinderCheck is still checking for the latest trusted domestic city rate in ${cityName}, so the page works more as a planning and tracker entry point until the next trusted price update lands.`

  const signalLine = showLiveFeed
    ? `${cityName} also has enough live local signal coverage right now to surface anonymous area-level booking pressure, which makes the city page more useful than a static price table alone.`
    : `${cityName} does not have a heavy live city signal layer right now, which is why the city page stays cleaner and pushes you toward the PIN tracker for a more exact local read.`

  return [
    {
      question: `What is the LPG price in ${cityName} today?`,
      answer: `${domesticLine} If a commercial 19kg rate is available, CylinderCheck shows that separately so household and business pricing do not get mixed together.`,
    },
    {
      question: `How should I use the ${cityName} city page before booking a refill?`,
      answer: `Start with the city page to understand the broader price and signal picture in ${cityName}. ${signalLine}`,
    },
    {
      question: `Are ${cityName} LPG city prices the same as the final agency quote?`,
      answer: `No. CylinderCheck shows tracked city-level market references for ${cityName}. Final quoted prices, booking status, and delivery timing still come from your LPG agency or supplier.`,
    },
    {
      question: `When should I open the PIN tracker instead of relying on the ${cityName} page?`,
      answer: liveAreaCount > 0 || agenciesCount > 0
        ? `Open the PIN tracker whenever you want a more exact read for your own part of ${cityName}. City pages are best for the broad market picture, while the tracker is better when timing, pressure, and delivery windows can differ between local pockets.`
        : `Open the PIN tracker whenever you want a more exact read for your own part of ${cityName}. The city page is useful as a reference, but the tracker is still the better tool for precise household planning.`,
    },
  ]
}

function pickRelatedCities(currentCity) {
  const priorityMap = new Map(
    DISCOVERY_CITY_PRIORITY.map((city, index) => [city.toLowerCase(), index]),
  )
  const preferredCities = CITY_RELATED_GROUPS[currentCity] || []
  const seen = new Set([currentCity.toLowerCase()])
  const ordered = []

  for (const city of preferredCities) {
    const key = city.toLowerCase()
    if (seen.has(key) || !priorityMap.has(key)) continue
    seen.add(key)
    ordered.push(city)
  }

  const fallbackCities = DISCOVERY_CITY_PRIORITY
    .filter((city) => !seen.has(city.toLowerCase()))
    .sort(
      (a, b) =>
        (priorityMap.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
        (priorityMap.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER),
    )

  for (const city of fallbackCities) {
    if (ordered.length >= RELATED_CITY_LIMIT) break
    ordered.push(city)
  }

  return ordered.slice(0, RELATED_CITY_LIMIT).map((city) => ({
    city,
    slug: city.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  }))
}

function PriceHistoryChartFallback({ cityName }) {
  return (
    <Card variant="inset" className="city-chart-fallback h-full flex flex-col min-h-[260px]">
      <CardHeader title={`Price Trend (${cityName})`} titleAs="h3" />
      <CardBody className="city-chart-fallback__body">
        <div className="city-chart-fallback__plot" aria-hidden="true">
          <span className="city-chart-fallback__line city-chart-fallback__line--a" />
          <span className="city-chart-fallback__line city-chart-fallback__line--b" />
          <span className="city-chart-fallback__line city-chart-fallback__line--c" />
        </div>
        <div className="city-chart-fallback__meta">
          <span className="city-chart-fallback__pill" />
          <span className="city-chart-fallback__pill city-chart-fallback__pill--short" />
        </div>
      </CardBody>
    </Card>
  )
}

export default function CitySEOPage() {
  const params = useParams()
  const rawRouteSlug = params.citySlug || params.cityPageSlug || params['*'] || ''
  const citySlug = rawRouteSlug.startsWith('lpg-price-in-')
    ? rawRouteSlug.slice('lpg-price-in-'.length)
    : rawRouteSlug
  const rawCity = formatCityNameFromSlug(citySlug)
  const normalizedCity = CITY_NORMALISE[rawCity.toLowerCase()] || rawCity

  const [prices, setPrices] = useState({ domestic: null, commercial: null, history: [] })
  const [citySignals, setCitySignals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function fetchData() {
      setLoading(true)

      const { data: priceData } = await supabase
        .from('lpg_prices')
        .select('*')
        .eq('city', normalizedCity)
        .order('recorded_at', { ascending: false })
        .limit(50)

      const { data: agencyData } = await supabase
        .from('pin_track_summary_v1')
        .select('*')
        .eq('city', normalizedCity)
        .order('report_count_30d', { ascending: false })
        .limit(30)

      if (!active) return

      if (priceData && priceData.length > 0) {
        const domesticLatest = priceData.find(
          (priceRow) => priceRow.product_type === LPG_PRODUCT_TYPES.domestic_14_2kg,
        )
        const commercialLatest = priceData.find(
          (priceRow) => priceRow.product_type === LPG_PRODUCT_TYPES.commercial_19kg,
        )

        const historyDataMap = new Map()
        priceData
          .filter((priceRow) => priceRow.product_type === LPG_PRODUCT_TYPES.domestic_14_2kg)
          .forEach((priceRow) => {
            const dateKey = priceRow.recorded_at.split('T')[0]
            if (!historyDataMap.has(dateKey)) {
              historyDataMap.set(dateKey, { date: priceRow.recorded_at, price: priceRow.price })
            }
          })

        const historyData = Array.from(historyDataMap.values()).reverse()

        setPrices({
          domestic: domesticLatest,
          commercial: commercialLatest,
          history: historyData,
        })
      } else {
        setPrices({ domestic: null, commercial: null, history: [] })
      }

      const citySignalRows = Array.isArray(agencyData) ? agencyData : []
      const hasProductSplit = citySignalRows.some(
        (row) =>
          Object.hasOwn(row, 'pressure_product_type') || Object.hasOwn(row, 'delivery_product_type'),
      )
      const domesticSignals = hasProductSplit
        ? citySignalRows.filter(
            (row) =>
              (!Object.hasOwn(row, 'pressure_product_type') || row.pressure_product_type === DOMESTIC_PRODUCT) &&
              (!Object.hasOwn(row, 'delivery_product_type') || row.delivery_product_type === DOMESTIC_PRODUCT),
          )
        : citySignalRows

      setCitySignals(domesticSignals)
      setLoading(false)
    }

    fetchData()
    return () => {
      active = false
    }
  }, [normalizedCity])

  const liveSignals = useMemo(() => {
    const ranked = [...citySignals].filter(hasMeaningfulSignal).sort(rankSignalRow)
    const seenAreas = new Set()
    const items = []

    for (const row of ranked) {
      const key = `${formatAreaLabel(row, normalizedCity)}::${String(row.pressure_level || '').toLowerCase()}`
      if (seenAreas.has(key)) continue

      seenAreas.add(key)
      items.push({
        key,
        areaLabel: formatAreaLabel(row, normalizedCity),
        pressureLevel: String(row.pressure_level || '').toLowerCase(),
        pressureTitle: pressureLabel(row.pressure_level),
        copy: buildSignalCopy(row),
        meta: buildSignalMeta(row),
      })

      if (items.length >= LIVE_FEED_MAX_ITEMS) break
    }

    return items
  }, [citySignals, normalizedCity])

  const showLiveFeed = useMemo(
    () => citySignals.length >= LIVE_FEED_MIN_ROWS && liveSignals.length >= LIVE_FEED_MIN_ACTIVE_ITEMS,
    [citySignals.length, liveSignals.length],
  )

  const agencies = useMemo(() => {
    const uniqueAgencies = []
    const seen = new Set()

    for (const row of citySignals) {
      if (row.distributor_name && !seen.has(row.distributor_name)) {
        seen.add(row.distributor_name)
        uniqueAgencies.push(row)
      }
    }

    return uniqueAgencies.slice(0, 5)
  }, [citySignals])

  const strongestSignalLevel = liveSignals[0]?.pressureLevel || 'limited'
  const cityOutlook = useMemo(
    () =>
      describeCityOutlook({
        cityName: normalizedCity,
        strongestLevel: strongestSignalLevel,
        showLiveFeed,
        liveAreaCount: liveSignals.length,
      }),
    [liveSignals.length, normalizedCity, showLiveFeed, strongestSignalLevel],
  )

  const planningCards = useMemo(
    () => [
      {
        title: 'City pressure read',
        value: showLiveFeed ? pressureLabel(strongestSignalLevel) : 'Signals still building',
        body: showLiveFeed
          ? `${liveSignals.length} local pocket${liveSignals.length === 1 ? '' : 's'} are shaping the city-level read right now.`
          : `The city page is currently acting more as a clean LPG reference than a heavy live-signal dashboard.`,
      },
      {
        title: 'Price reference',
        value: prices.domestic ? `${RUPEE}${prices.domestic.price}` : 'Waiting for latest scrape',
        body: prices.commercial
          ? `Commercial 19kg is tracked separately at ${RUPEE}${prices.commercial.price}, so household and business reads stay distinct.`
          : 'Domestic and commercial references do not get blended together on CylinderCheck.',
      },
      {
        title: 'Best next move',
        value: showLiveFeed || agencies.length > 0 ? 'Use the PIN tracker for exact timing' : 'Use the city page, then confirm by PIN',
        body:
          agencies.length > 0
            ? `${agencies.length} trusted distributor row${agencies.length === 1 ? '' : 's'} help anchor the local utility layer below.`
            : 'If your own area feels different from the city summary, the PIN tracker is still the sharper tool.',
      },
    ],
    [agencies.length, liveSignals.length, prices.commercial, prices.domestic, showLiveFeed, strongestSignalLevel],
  )

  const cityFaqs = useMemo(
    () =>
      buildCityFaqs({
        cityName: normalizedCity,
        showLiveFeed,
        prices,
        agenciesCount: agencies.length,
        liveAreaCount: liveSignals.length,
      }),
    [agencies.length, liveSignals.length, normalizedCity, prices, showLiveFeed],
  )

  const relatedCities = useMemo(() => pickRelatedCities(normalizedCity), [normalizedCity])

  const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(),
  )
  const title = `LPG Cylinder Price in ${normalizedCity} Today \u2014 ${monthYear}`

  return (
    <div className="page-root pb-12">
      <PageHeader
        title={title}
        description={`Check ${normalizedCity} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Track price hikes and booking delivery estimates for Indane, HP Gas, and Bharat Gas.`}
      />

      <div className="page-grid-dual">
        <motion.div variants={springs.item} initial="hidden" animate="visible" className="h-full">
          <Card variant="inset" className="h-full">
            <CardHeader title="Live Market Rates" titleAs="h2" />
            <CardBody className="flex flex-col gap-5">
              <div className="rounded-[20px] border border-[var(--divider)] bg-[var(--bg-raised)] px-6 py-6 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <div className="type-card-title text-[var(--accent-glow)]">Domestic 14.2kg</div>
                  <Store className="h-5 w-5 text-[var(--text-muted)] opacity-60" />
                </div>
                <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                  {prices.domestic ? `${RUPEE}${prices.domestic.price}` : 'Checking...'}
                </div>
                {prices.domestic && (
                  <p className="type-meta mt-2 text-[var(--text-muted)]">
                    Source:{' '}
                    {prices.domestic.source_url
                      ? new URL(prices.domestic.source_url).hostname
                      : 'Market Tracking'}
                  </p>
                )}
              </div>

              <div className="rounded-[20px] border border-[var(--divider)] bg-[var(--bg-raised)] px-6 py-6 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <div className="type-card-title">Commercial 19kg</div>
                  <Truck className="h-5 w-5 text-[var(--text-muted)] opacity-60" />
                </div>
                <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                  {prices.commercial ? `${RUPEE}${prices.commercial.price}` : 'Checking...'}
                </div>
              </div>

              <Callout tone="accent" edge={false}>
                <p className="type-note mb-0">
                  CylinderCheck tracks published city rates. Final quotes still come from your local agency.
                </p>
              </Callout>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={springs.item} initial="hidden" animate="visible" className="flex h-full flex-col gap-6">
          <div className="flex-grow">
            <Suspense fallback={<PriceHistoryChartFallback cityName={normalizedCity} />}>
              <PriceHistoryChart data={prices.history} title={`Price Trend (${normalizedCity})`} />
            </Suspense>
          </div>

          <Card className="flex-shrink-0">
            <CardBody className="flex items-center justify-between gap-4 py-2">
              <div>
                <h3 className="type-card-title mb-1">LPG Cylinder Booking</h3>
                <p className="type-meta text-[var(--text-muted)]">
                  Check gas cylinder shortages and exact delivery delays in {normalizedCity}.
                </p>
              </div>
              <Link
                to="/track"
                className="glass-btn inline-flex flex-shrink-0 items-center rounded-full px-6 py-3 text-sm font-semibold tracking-wide text-[var(--text-primary)] transition-transform hover:scale-105"
              >
                Tracker <span className="ml-2">{ARROW}</span>
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      <section className="page-section city-summary-strip">
        <Card variant="inset" className="city-summary-strip__card card--utility-tight">
          <CardHeader title={`How to read ${normalizedCity} right now`} titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">{cityOutlook}</p>
          </CardHeader>
          <CardBody className="city-summary-strip__body">
            <div className="city-summary-strip__grid">
              {planningCards.map((item) => (
                <article key={item.title} className="city-summary-card">
                  <p className="type-card-title mb-1">{item.title}</p>
                  <div className="city-summary-card__value">{item.value}</div>
                  <p className="type-note mb-0">{item.body}</p>
                </article>
              ))}
            </div>

            <Callout tone="clear" edge={false} className="city-summary-strip__callout">
              <p className="type-note mb-0">
                City pages help you judge the broader market in {normalizedCity}. When booking
                timing becomes important for your own home, switch to the PIN tracker for the
                sharper local read.
              </p>
            </Callout>
          </CardBody>
        </Card>
      </section>

      {showLiveFeed ? (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="page-section city-live-feed"
          aria-labelledby="city-live-feed-heading"
        >
          <div className="city-live-feed__heading">
            <div className="city-live-feed__heading-copy">
              <h2 id="city-live-feed-heading" className="type-section-title mb-1">
                Live local booking signals
              </h2>
              <p className="type-meta mb-0 city-live-feed__intro">
                Anonymous, area-level signals from CylinderCheck&apos;s live local model. Stronger pockets surface first, quieter cities stay clean.
              </p>
            </div>
            <span className="badge city-live-feed__badge">
              <Sparkles size={14} aria-hidden="true" />
              Fresh city intelligence
            </span>
          </div>

          <div className="city-live-feed__grid">
            {liveSignals.map((item) => (
              <motion.article
                key={item.key}
                variants={springs.item}
                className={`city-live-feed__item city-live-feed__item--${item.pressureLevel || 'limited'}`}
              >
                <div className="city-live-feed__item-top">
                  <div className="city-live-feed__icon-wrap" aria-hidden="true">
                    <Activity className="city-live-feed__icon" />
                  </div>
                  <div className="min-w-0">
                    <p className="type-card-title mb-1 city-live-feed__title">{item.areaLabel}</p>
                    <p className="type-meta mb-0 city-live-feed__state">{item.pressureTitle}</p>
                  </div>
                </div>

                <p className="type-card-copy city-live-feed__copy mb-0">{item.copy}</p>

                <div className="city-live-feed__meta">
                  {item.meta.map((entry) => (
                    <span key={entry} className="city-live-feed__meta-chip">
                      {entry}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>

          <Callout tone="accent" edge={false} className="city-live-feed__callout">
            <div className="city-live-feed__callout-copy">
              <p className="type-card-copy mb-1 text-[var(--text-primary)]">
                Need your exact PIN instead of city-level signals?
              </p>
              <p className="type-note mb-0">
                The tracker reads your local booking window, delivery pressure, and planning timing more precisely than a city page can.
              </p>
            </div>
            <Link to="/track" className="track-evidence-callout__link">
              Open the tracker {ARROW}
            </Link>
          </Callout>
        </motion.section>
      ) : null}

      <section className="page-section city-related-rail">
          <Card variant="inset" className="city-related-rail__card card--utility-tight">
          <CardHeader title={`Keep browsing other tracked LPG city pages`} titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              Compare other tracked city pages, then switch to the booking tracker when you need a
              precise PIN-level read instead of city-level context.
            </p>
          </CardHeader>
          <CardBody className="city-related-rail__body">
            <div className="city-related-rail__grid">
              {relatedCities.map(({ city, slug }) => (
                <Link key={slug} to={`/lpg-price-in-${slug}`} className="city-related-rail__link">
                  <span className="type-card-title">{city}</span>
                  <span className="type-note">
                    LPG prices, local signals, and tracker context {ARROW}
                  </span>
                </Link>
              ))}
            </div>
            <div className="city-related-rail__actions">
              <Link to="/cities" className="btn-ghost w-full justify-center">
                Browse all tracked cities {ARROW}
              </Link>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="page-section city-faq">
        <Card variant="inset" className="city-faq__card card--utility-tight">
          <CardHeader title={`Questions people have before checking LPG in ${normalizedCity}`} titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              These answers keep the city page practical: what the rate means, when to trust the
              city read, and when to switch to the PIN tracker for something more exact.
            </p>
          </CardHeader>
          <CardBody className="city-faq__body">
            <div className="city-faq__list">
              {cityFaqs.map((item, index) => (
                <details key={item.question} className="city-faq__item" open={index === 0}>
                  <summary className="city-faq__summary">
                    <span className="type-card-title">{item.question}</span>
                    <ChevronDown className="city-faq__caret" aria-hidden="true" />
                  </summary>
                  <div className="city-faq__answer">
                    <p className="type-note mb-0">{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="page-section mt-8"
      >
        <h2 className="type-section-title mb-2 px-2">
          LPG Delivery Delays & Distributors in {normalizedCity}
        </h2>
        <div className="card card--flush list border-[var(--divider)] shadow-sm">
          {!loading && agencies.length === 0 && (
            <div className="type-empty-copy p-10 text-center text-[var(--text-muted)]">
              No recent agency reports logged for this city. Check delivery status by PIN in the tracker.
            </div>
          )}

          {loading && (
            <div className="type-empty-copy animate-pulse p-10 text-center text-[var(--text-muted)]">
              Loading verified local distributors...
            </div>
          )}

          {agencies.map((agency) => (
            <motion.div
              key={agency.pin || agency.distributor_name}
              variants={springs.item}
              className="list-row group items-center transition-colors duration-300 hover:bg-[var(--bg-inset)]"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[var(--fog-border)] bg-[var(--glass-mid)] shadow-sm transition-transform duration-300 group-hover:scale-110">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-glow)]" />
              </div>
              <div className="flex min-w-0 flex-grow flex-col justify-center">
                <div className="type-card-title truncate text-[var(--text-primary)]">
                  {agency.distributor_name}
                </div>
                <div className="type-meta mt-0.5 flex items-center gap-1.5 truncate text-[var(--text-muted)] opacity-80">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {agency.area || 'City Area'} {'\u2022'} PIN {agency.pin}
                  </span>
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col justify-center text-right">
                <div className="type-data-value text-[var(--text-primary)]">
                  {agency.delivery_estimate_days ? `${Math.round(agency.delivery_estimate_days)} days` : 'Avg'}
                </div>
                <div className="type-meta mt-0.5 flex items-center justify-end gap-1 text-[var(--status-early)] opacity-90">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Est.</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
