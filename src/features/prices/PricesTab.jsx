// src/features/prices/PricesTab.jsx
// Task 22: Preserve existing Leaflet map, restyle with Deeplight tokens
// Map tiles: Carto dark (dark mode), Carto light (light mode)
// City dots: green/amber/red by price tier — same logic as PriceTicker
// Glass only on the popup, not on the map itself

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SectionMarker } from '../../components/shared/SectionMarker'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { springs } from '../../lib/springs'
import { COMPANIES, CITY_COORDS } from '../../lib/utils'

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

function priceColor(price) {
  if (!price) return 'var(--text-muted)'
  if (price < 880) return 'var(--status-clear)'
  if (price < 930) return 'var(--status-early)'
  return 'var(--status-active)'
}

function priceCircleColor(price) {
  if (!price) return '#888'
  if (price < 880) return 'var(--status-clear)'
  if (price < 930) return 'var(--status-early)'
  return 'var(--status-active)'
}

export default function PricesTab({ mapPrices = {}, lastUpdated }) {
  const mapRef   = useRef(null)
  const leafRef  = useRef(null)
  const [selected, setSelected] = useState(null) // { city, companies }
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'

  useEffect(() => {
    // Dynamic Leaflet import to avoid SSR issues
    let L
    let map

    async function initMap() {
      const mod = await import('leaflet')
      L = mod.default

      // Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (leafRef.current) {
        leafRef.current.remove()
        leafRef.current = null
      }

      map = L.map(mapRef.current, {
        center: [22.5, 82.3],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
      })
      leafRef.current = map

      // Tile layer based on theme
      const tileUrl = isDark ? TILE_DARK : TILE_LIGHT
      L.tileLayer(tileUrl, {
        maxZoom: 18,
        attribution: '© CartoDB',
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.control.attribution({ position: 'bottomright', prefix: '© CartoDB' }).addTo(map)

      // City markers
      Object.entries(CITY_COORDS).forEach(([city, { lat, lng }]) => {
        const comps = mapPrices[city]
        if (!comps) return

        const prices = COMPANIES.map(c => comps[c]?.price).filter(Boolean)
        const cheapest = prices.length ? Math.min(...prices) : null

        // Custom circle marker as a div icon
        const color = cheapest < 880 ? '#6DB88A'
          : cheapest < 930 ? '#E8A840'
          : '#C45A38'

        const html = `<div style="
          width: 12px; height: 12px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 0 8px ${color};
          cursor: pointer;
        "></div>`

        const icon = L.divIcon({ html, className: '', iconSize: [12, 12], iconAnchor: [6, 6] })
        const marker = L.marker([lat, lng], { icon }).addTo(map)

        marker.on('click', () => {
          setSelected({ city, companies: comps, cheapest })
        })
      })
    }

    initMap().catch(console.error)

    return () => {
      if (leafRef.current) {
        leafRef.current.remove()
        leafRef.current = null
      }
    }
  }, [mapPrices, isDark])

  return (
    <div>
      <SectionMarker status="clear" label="LPG Prices" sublabel={
        lastUpdated
          ? `Updated ${new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
          : undefined
      } />

      <h1 className="font-display font-extrabold text-[clamp(24px,4vw,36px)]
                     tracking-[-0.03em] text-[var(--text-primary)]
                     mb-2 leading-[1.1]">
        LPG Prices Today
      </h1>
      <p className="text-[var(--text-secondary)] text-[15px] mb-6 max-w-[560px]">
        Domestic 14.2 kg cylinder prices across 12 major cities.
        Click any city dot for detailed rates.
      </p>

      {/* Map container — no glass on the map itself */}
      <div className="relative rounded-lg overflow-hidden border border-[var(--border)]
                      mb-6"
           style={{ height: '420px' }}>
        <div ref={mapRef} className="w-full h-full" />

        {/* City popup — glass */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="popup"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={springs.smooth}
              className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4
                         md:w-[280px] z-[1000] rounded-lg p-5"
              style={{
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                background: 'var(--glass-deep)',
                border: '1px solid var(--fog-border)',
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="font-display font-bold text-[18px]
                                text-[var(--text-primary)]">
                  {selected.city}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]
                             text-[18px] leading-none pl-3"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2">
                {COMPANIES.map(company => {
                  const price = selected.companies[company]?.price
                  return (
                    <div key={company}
                      className="flex justify-between items-center py-2
                                 border-b border-[var(--divider)] last:border-0">
                      <span className="font-body text-[13px]
                                       text-[var(--text-secondary)]">
                        {company}
                      </span>
                      <span className="font-data text-[16px] font-bold"
                            style={{ color: priceColor(price) }}>
                        {price ? `₹${price}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {selected.cheapest && (
                <>
                  <KalamkariDivider />
                  <div className="flex justify-between items-center">
                    <span className="font-data text-[10px] uppercase
                                     tracking-[0.12em] text-[var(--text-muted)]">
                      Cheapest today
                    </span>
                    <span className="font-data text-[18px] font-bold"
                          style={{ color: priceColor(selected.cheapest) }}>
                      ₹{selected.cheapest}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Price legend */}
      <div className="flex items-center gap-5 mb-6 flex-wrap">
        {[
          ['< ₹880', 'var(--status-clear)',  'Good rate'],
          ['₹880–930', 'var(--status-early)', 'Average'],
          ['> ₹930',  'var(--status-active)', 'High'],
        ].map(([range, color, label]) => (
          <div key={range} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: color }} />
            <span className="font-data text-[11px] text-[var(--text-muted)]
                             uppercase tracking-[0.08em]">
              {range} · {label}
            </span>
          </div>
        ))}
      </div>

      {/* All cities table */}
      {Object.keys(mapPrices).length > 0 && (
        <div className="rounded-lg border border-[var(--border)]
                        bg-[var(--bg-raised)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <span className="font-data text-[11px] uppercase
                             tracking-[0.14em] text-[var(--text-muted)]">
              All Cities
            </span>
          </div>
          <div className="divide-y divide-[var(--divider)]">
            {Object.entries(mapPrices).map(([city, comps]) => {
              const prices = COMPANIES.map(c => comps[c]?.price).filter(Boolean)
              const cheapest = prices.length ? Math.min(...prices) : null
              return (
                <button
                  key={city}
                  onClick={() => setSelected({ city, companies: comps, cheapest })}
                  className="flex items-center w-full px-5 py-3
                             hover:bg-[var(--bg-inset)] transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mr-3"
                        style={{ background: priceCircleColor(cheapest) }} />
                  <span className="font-body text-[14px]
                                   text-[var(--text-primary)] flex-1">
                    {city}
                  </span>
                  <span className="font-data text-[16px] font-bold"
                        style={{ color: priceColor(cheapest) }}>
                    {cheapest ? `₹${cheapest}` : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
