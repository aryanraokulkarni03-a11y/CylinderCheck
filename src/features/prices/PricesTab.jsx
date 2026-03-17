// src/features/prices/PricesTab.jsx
// LPG Prices: Leaflet map + dense city table (Deeplight aligned)

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SectionMarker } from '../../components/shared/SectionMarker'
import { KalamkariDivider } from '../../components/shared/KalamkariDivider'
import { springs } from '../../lib/springs'
import { COMPANIES, CITY_COORDS } from '../../lib/utils'
import { useLeaflet } from '../../lib/useLeaflet'
import { useThemeMode } from '../../lib/useThemeMode'

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const RUPEE = '\u20B9'
const COPY = '\u00A9'
const EM_DASH = '\u2014'
const TIMES = '\u00D7'

function tileUrlForMode(mode) {
  return mode === 'light' ? TILE_LIGHT : TILE_DARK
}

function priceTone(price) {
  if (!price) return { color: 'var(--text-muted)', glow: 'var(--shadow-glow)' }
  if (price < 880) return { color: 'var(--status-clear)', glow: 'var(--status-clear-glow)' }
  if (price < 930) return { color: 'var(--status-early)', glow: 'var(--status-early-glow)' }
  return { color: 'var(--status-active)', glow: 'var(--status-active-glow)' }
}

function cheapestPriceForCompanies(companies) {
  const prices = COMPANIES.map((c) => companies?.[c]?.price).filter(Boolean)
  return prices.length ? Math.min(...prices) : null
}

export default function PricesTab({ mapPrices = {}, lastUpdated }) {
  const mapRef = useRef(null)
  const mapInstRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)

  const [selected, setSelected] = useState(null) // { city, companies, cheapest }
  const shouldReduceMotion = useReducedMotion()

  const { L, loaded, error } = useLeaflet()
  const themeMode = useThemeMode()

  useEffect(() => {
    if (!loaded || !L) return
    if (!mapRef.current || mapInstRef.current) return

    const map = L.map(mapRef.current, {
      center: [22.5, 82.3],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    })
    mapInstRef.current = map

    tileLayerRef.current = L.tileLayer(tileUrlForMode(themeMode), {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: `${COPY} OpenStreetMap ${COPY} CARTO`,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)

    return () => {
      tileLayerRef.current = null
      markersLayerRef.current = null
      if (mapInstRef.current) {
        mapInstRef.current.remove()
        mapInstRef.current = null
      }
    }
  }, [loaded, L, themeMode])

  useEffect(() => {
    if (!loaded || !L) return
    const map = mapInstRef.current
    const tile = tileLayerRef.current
    const markers = markersLayerRef.current
    if (!map || !tile || !markers) return

    tile.setUrl(tileUrlForMode(themeMode))
    markers.clearLayers()

    Object.entries(CITY_COORDS).forEach(([city, coords]) => {
      const comps = mapPrices[city]
      if (!comps) return

      const cheapest = cheapestPriceForCompanies(comps)
      const tone = priceTone(cheapest)

      const iconHtml = `<div style="
        width: 12px; height: 12px;
        border-radius: 9999px;
        background: ${tone.color};
        border: 2px solid var(--bg-base);
        box-shadow: 0 0 12px ${tone.glow};
        cursor: pointer;
      "></div>`

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      const marker = L.marker([coords.lat, coords.lng], { icon })
      marker.on('click', () => setSelected({ city, companies: comps, cheapest }))
      marker.addTo(markers)
    })
  }, [loaded, L, mapPrices, themeMode])

  return (
    <div>
      <SectionMarker
        status="clear"
        label="LPG Prices"
        sublabel={
          lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
            : undefined
        }
      />

      <h1
        className="font-display font-extrabold text-[clamp(24px,4vw,36px)]
                   tracking-[-0.03em] text-[var(--text-primary)]
                   mb-2 leading-[1.1]"
      >
        LPG Prices Today
      </h1>
      <p className="text-[var(--text-secondary)] text-[15px] mb-6 max-w-[560px]">
        Domestic 14.2 kg cylinder prices across major cities. Click any city dot for detailed rates.
      </p>

      <div
        className="relative rounded-lg overflow-hidden border border-[var(--border)] mb-6 bg-[var(--bg-inset)]"
        style={{ height: '420px' }}
      >
        <div ref={mapRef} className="w-full h-full" />

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--text-muted)]">
            Loading map...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-lg border border-[var(--status-active-border)] bg-[var(--status-active-soft)] p-5 text-center">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Map failed to load. You can still browse the city table below.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.div
              key="popup"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12, scale: shouldReduceMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8, scale: shouldReduceMotion ? 1 : 0.97 }}
              transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
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
                <div className="font-display font-bold text-[18px] text-[var(--text-primary)]">
                  {selected.city}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]
                             text-[18px] leading-none pl-3"
                  aria-label="Close"
                >
                  {TIMES}
                </button>
              </div>

              <div className="space-y-2">
                {COMPANIES.map((company) => {
                  const price = selected.companies?.[company]?.price
                  return (
                    <div
                      key={company}
                      className="flex justify-between items-center py-2
                                 border-b border-[var(--divider)] last:border-0"
                    >
                      <span className="font-body text-[13px] text-[var(--text-secondary)]">
                        {company}
                      </span>
                      <span
                        className="font-data text-[16px] font-bold"
                        style={{ color: priceTone(price).color }}
                      >
                        {price ? `${RUPEE}${price}` : EM_DASH}
                      </span>
                    </div>
                  )
                })}
              </div>

              {selected.cheapest && (
                <>
                  <KalamkariDivider />
                  <div className="flex justify-between items-center">
                    <span
                      className="font-data text-[10px] uppercase tracking-[0.12em]
                                 text-[var(--text-muted)]"
                    >
                      Cheapest today
                    </span>
                    <span
                      className="font-data text-[18px] font-bold"
                      style={{ color: priceTone(selected.cheapest).color }}
                    >
                      {RUPEE}
                      {selected.cheapest}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-5 mb-6 flex-wrap">
        {[
          [`< ${RUPEE}880`, 'var(--status-clear)', 'Good rate'],
          [`${RUPEE}880 to 930`, 'var(--status-early)', 'Average'],
          [`> ${RUPEE}930`, 'var(--status-active)', 'High'],
        ].map(([range, color, label]) => (
          <div key={range} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
            <span
              className="font-data text-[11px] text-[var(--text-muted)]
                         uppercase tracking-[0.08em]"
            >
              {range} · {label}
            </span>
          </div>
        ))}
      </div>

      {Object.keys(mapPrices).length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <span className="font-data text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              All Cities
            </span>
          </div>
          <div className="divide-y divide-[var(--divider)]">
            {Object.entries(mapPrices).map(([city, comps]) => {
              const cheapest = cheapestPriceForCompanies(comps)
              const tone = priceTone(cheapest)
              return (
                <button
                  key={city}
                  onClick={() => setSelected({ city, companies: comps, cheapest })}
                  className="flex items-center w-full px-5 py-3
                             hover:bg-[var(--bg-inset)] transition-colors text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mr-3"
                    style={{ background: tone.color }}
                  />
                  <span className="font-body text-[14px] text-[var(--text-primary)] flex-1">
                    {city}
                  </span>
                  <span className="font-data text-[16px] font-bold" style={{ color: tone.color }}>
                    {cheapest ? `${RUPEE}${cheapest}` : EM_DASH}
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

