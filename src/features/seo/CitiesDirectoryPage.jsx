// src/features/seo/CitiesDirectoryPage.jsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Map, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { springs } from '../../lib/springs'

// Import statically generated cities data
import citiesData from '../../data/cities.json'

export default function CitiesDirectoryPage() {
  const sortedCities = useMemo(() => {
    return [...(citiesData || [])].sort((a, b) => a.localeCompare(b))
  }, [])

  return (
    <div className="page-root pb-12">
      <PageHeader
        icon={Map}
        title="Check LPG Prices by City"
        description="Find today's 14.2kg domestic and 19kg commercial LPG cylinder rates, along with delivery delay tracking by city across India."
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {sortedCities.map((city) => {
          const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          return (
            <motion.div key={citySlug} variants={springs.item}>
              <Link to={`/lpg-price-in-${citySlug}`} className="block h-full group">
                <Card variant="inset" className="h-full flex items-center justify-between p-4 transition-all duration-300 hover:shadow-md hover:border-[var(--accent-glow)] group-hover:-translate-y-0.5">
                  <span className="type-card-title text-[var(--text-primary)] text-sm md:text-base">{city}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-glow)] transition-colors opacity-50 group-hover:opacity-100" />
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
      
      {sortedCities.length === 0 && (
        <div className="p-12 text-center text-[var(--text-muted)] type-empty-copy card border-[var(--divider)]">
          Cities directory is currently updating. Please check back shortly.
        </div>
      )}
    </div>
  )
}
