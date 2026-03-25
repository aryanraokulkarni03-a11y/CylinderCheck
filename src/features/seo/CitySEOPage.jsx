// src/features/seo/CitySEOPage.jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Store, Truck, Clock, ShieldCheck } from 'lucide-react'
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

// Helper to format slug to readable name
function formatCityNameFromSlug(slug) {
  if (!slug) return 'Your City'
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function CitySEOPage() {
  const { citySlug } = useParams()
  const rawCity = formatCityNameFromSlug(citySlug)
  const normalizedCity = CITY_NORMALISE[rawCity.toLowerCase()] || rawCity

  const [prices, setPrices] = useState({ domestic: null, commercial: null, history: [] })
  const [agencies, setAgencies] = useState([])
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
        .order('report_count_30d', { ascending: false })
        .limit(30)

      if (!active) return

      if (priceData && priceData.length > 0) {
        const domesticLatest = priceData.find(p => p.product_type === LPG_PRODUCT_TYPES.domestic_14_2kg)
        const commercialLatest = priceData.find(p => p.product_type === LPG_PRODUCT_TYPES.commercial_19kg)

        // Generate history series for the chart (domestic 14.2kg), map by unique dates mostly avoiding duplicates
        const historyDataMap = new Map()
        priceData
          .filter(p => p.product_type === LPG_PRODUCT_TYPES.domestic_14_2kg)
          .forEach(p => {
             const dateKey = p.recorded_at.split('T')[0]
             if (!historyDataMap.has(dateKey)) {
                 historyDataMap.set(dateKey, { date: p.recorded_at, price: p.price })
             }
          })
          
        const historyData = Array.from(historyDataMap.values()).reverse()

        setPrices({
          domestic: domesticLatest,
          commercial: commercialLatest,
          history: historyData
        })
      } else {
        setPrices({ domestic: null, commercial: null, history: [] })
      }

      if (agencyData) {
        const uniqueAgencies = []
        const seen = new Set()
        for (const row of agencyData) {
          if (row.distributor_name && !seen.has(row.distributor_name)) {
            seen.add(row.distributor_name)
            uniqueAgencies.push(row)
          }
        }
        setAgencies(uniqueAgencies.slice(0, 5))
      } else {
        setAgencies([])
      }

      setLoading(false)
    }

    fetchData()
    return () => { active = false }
  }, [normalizedCity])

  const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
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
              <div className="rounded-[20px] border border-[var(--divider)] bg-[var(--bg-raised)] px-6 py-6 transition-transform hover:-translate-y-0.5 hover:shadow-lg duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="type-card-title text-[var(--accent-glow)]">Domestic 14.2kg</div>
                  <Store className="w-5 h-5 text-[var(--text-muted)] opacity-60" />
                </div>
                <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                  {prices.domestic ? `${RUPEE}${prices.domestic.price}` : 'Checking...'}
                </div>
                {prices.domestic && (
                  <p className="type-meta text-[var(--text-muted)] mt-2">
                    Source: {prices.domestic.source_url ? new URL(prices.domestic.source_url).hostname : 'Market Tracking'}
                  </p>
                )}
              </div>
              
              <div className="rounded-[20px] border border-[var(--divider)] bg-[var(--bg-raised)] px-6 py-6 transition-transform hover:-translate-y-0.5 hover:shadow-lg duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="type-card-title">Commercial 19kg</div>
                  <Truck className="w-5 h-5 text-[var(--text-muted)] opacity-60" />
                </div>
                <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                  {prices.commercial ? `${RUPEE}${prices.commercial.price}` : 'Checking...'}
                </div>
              </div>
              
              <Callout tone="accent" edge={false}>
                <p className="type-note mb-0">CylinderCheck tracks published city rates. Final quotes still come from your local agency.</p>
              </Callout>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={springs.item} initial="hidden" animate="visible" className="flex flex-col gap-6 h-full">
          <div className="flex-grow">
            <PriceHistoryChart data={prices.history} title={`Price Trend (${normalizedCity})`} />
          </div>
          
          <Card className="flex-shrink-0">
            <CardBody className="flex items-center justify-between gap-4 py-2">
              <div>
                <h3 className="type-card-title mb-1">LPG Cylinder Booking</h3>
                <p className="type-meta text-[var(--text-muted)]">Check gas cylinder shortages & exact delivery delays in {normalizedCity}.</p>
              </div>
              <Link to="/track" className="glass-btn px-6 py-3 rounded-full text-sm font-semibold tracking-wide text-[var(--text-primary)] flex-shrink-0 inline-flex items-center transition-transform hover:scale-105">
                Tracker <span className="ml-2">{ARROW}</span>
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="page-section mt-8"
      >
        <h2 className="type-section-title px-2 mb-2">LPG Delivery Delays & Distributors in {normalizedCity}</h2>
        <div className="card card--flush list border-[var(--divider)] shadow-sm">
          {!loading && agencies.length === 0 && (
            <div className="p-10 text-center text-[var(--text-muted)] type-empty-copy">
              No recent agency reports logged for this city. Check delivery status by PIN in the tracker.
            </div>
          )}
          
          {loading && (
            <div className="p-10 text-center text-[var(--text-muted)] animate-pulse type-empty-copy">
              Loading verified local distributors...
            </div>
          )}

          {agencies.map((agency) => (
            <motion.div 
              key={agency.pin || agency.distributor_name} 
              variants={springs.item}
              className="list-row group hover:bg-[var(--bg-inset)] transition-colors duration-300 items-center"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--glass-mid)] border border-[var(--fog-border)] flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300">
                <ShieldCheck className="w-5 h-5 text-[var(--accent-glow)]" />
              </div>
              <div className="flex-grow min-w-0 flex flex-col justify-center">
                <div className="type-card-title truncate text-[var(--text-primary)]">{agency.distributor_name}</div>
                <div className="type-meta text-[var(--text-muted)] mt-0.5 truncate flex items-center gap-1.5 opacity-80">
                  <MapPin className="w-3.5 h-3.5" /> 
                  <span>{agency.area || 'City Area'} \u2022 PIN {agency.pin}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right flex flex-col justify-center">
                <div className="type-data-value text-[var(--text-primary)]">
                  {agency.delivery_estimate_days ? `${Math.round(agency.delivery_estimate_days)} days` : 'Avg'}
                </div>
                <div className="type-meta text-[var(--status-early)] mt-0.5 flex items-center gap-1 justify-end opacity-90">
                  <Clock className="w-3.5 h-3.5" />
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
