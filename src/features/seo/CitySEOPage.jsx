// src/features/seo/CitySEOPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Store, Truck, Clock, ShieldCheck, Activity, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import PriceHistoryChart from './PriceHistoryChart'
import { supabase } from '../../supabaseClient'
import { CITY_NORMALISE, LPG_PRODUCT_TYPES } from '../../lib/utils'
import { springs } from '../../lib/springs'

const ARROW = '\u2192'
const RUPEE = '\u20B9'
const DOMESTIC_PRODUCT = LPG_PRODUCT_TYPES.domestic_14_2kg
const LIVE_FEED_MIN_ROWS = 3
const LIVE_FEED_MIN_ACTIVE_ITEMS = 2
const LIVE_FEED_MAX_ITEMS = 4
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

export default function CitySEOPage() {
  const params = useParams()
  const citySlug = params.citySlug || params['*'] || ''
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
        .ilike('city', normalizedCity)
        .order('recorded_at', { ascending: false })
        .limit(50)

      const { data: agencyData } = await supabase
        .from('pin_track_summary_v1')
        .select('*')
        .ilike('city', normalizedCity)
        .eq('pressure_product_type', DOMESTIC_PRODUCT)
        .eq('delivery_product_type', DOMESTIC_PRODUCT)
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

      setCitySignals(Array.isArray(agencyData) ? agencyData : [])
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
            <PriceHistoryChart data={prices.history} title={`Price Trend (${normalizedCity})`} />
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
