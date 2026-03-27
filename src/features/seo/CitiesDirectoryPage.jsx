// src/features/seo/CitiesDirectoryPage.jsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Map, MapPin, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import { springs } from '../../lib/springs'
import citiesData from '../../data/cities.json'

function cityHref(city) {
  return `/lpg-price-in-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

export default function CitiesDirectoryPage() {
  const sortedCities = useMemo(() => [...(citiesData || [])].sort((a, b) => a.localeCompare(b)), [])
  const featuredCities = useMemo(() => sortedCities.slice(0, 6), [sortedCities])
  const remainingCities = useMemo(() => sortedCities.slice(6), [sortedCities])

  return (
    <div className="page-root pb-12">
      <PageHeader
        icon={Map}
        title="Check LPG prices by city"
        description="Find today's 14.2kg domestic and 19kg commercial LPG cylinder rates, along with delivery delay tracking by city across India."
      />

      <section className="page-section page-section--tight cities-directory-intro">
        <div className="cities-directory-intro__grid">
          <Card variant="inset" className="cities-directory-intro__card card--utility-tight">
            <CardHeader title="Start with featured city pages" titleAs="h2">
              <p className="card-header__description type-card-copy mb-0">
                These pages are the fastest way into CylinderCheck&apos;s city-level LPG price
                reads, live local booking signals, and the next step into the PIN tracker.
              </p>
            </CardHeader>
            <CardBody className="cities-directory-featured">
              {featuredCities.map((city) => (
                <Link key={city} to={cityHref(city)} className="cities-directory-featured__link">
                  <span className="type-card-title">{city}</span>
                  <span className="type-note">
                    Price page, live signals, and local planning read <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card variant="inset" className="cities-directory-intro__card card--utility-tight">
            <CardBody className="cities-directory-intro__stack">
              <div className="cities-directory-intro__pill">
                <Activity size={16} />
                <span>City pages stay tied to live product data, not static rate tables.</span>
              </div>
              <div className="cities-directory-intro__pill">
                <MapPin size={16} />
                <span>Domestic 14.2kg and commercial 19kg remain separated cleanly.</span>
              </div>
              <div className="cities-directory-intro__pill">
                <Search size={16} />
                <span>Use a city page for discovery, then switch to the PIN tracker for exact reads.</span>
              </div>

              <Callout tone="accent" edge={false}>
                <p className="type-note mb-0">
                  Looking for a city not listed yet? CylinderCheck only publishes city pages once
                  the city exists in the tracked dataset.
                </p>
              </Callout>
            </CardBody>
          </Card>
        </div>
      </section>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        {remainingCities.map((city) => {
          const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          return (
            <motion.div key={slug} variants={springs.item}>
              <Link to={cityHref(city)} className="block h-full group">
                <Card
                  variant="inset"
                  className="flex h-full items-center justify-between p-4 transition-all duration-300 hover:border-[var(--accent-glow)] hover:shadow-md group-hover:-translate-y-0.5"
                >
                  <span className="type-card-title text-sm text-[var(--text-primary)] md:text-base">
                    {city}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] opacity-50 transition-colors group-hover:text-[var(--accent-glow)] group-hover:opacity-100" />
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {sortedCities.length === 0 && (
        <div className="type-empty-copy card border-[var(--divider)] p-12 text-center text-[var(--text-muted)]">
          Cities directory is currently updating. Please check back shortly.
        </div>
      )}

      <div className="page-section page-section--tight">
        <Callout tone="clear" edge={false}>
          <p className="type-note mb-0">
            Need a precise area-level read instead of city-level context? Open the{' '}
            <Link to="/track" className="type-inline-link">
              booking tracker
            </Link>{' '}
            and check your exact 6-digit PIN.
          </p>
        </Callout>
      </div>
    </div>
  )
}
