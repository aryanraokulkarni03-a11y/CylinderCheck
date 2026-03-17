// src/features/news/NewsMap.jsx
// Leaflet map showing which cities currently have news signals.

import { useEffect, useRef } from 'react'
import { CITY_COORDS, CITY_NORMALISE } from '../../lib/utils'
import { useLeaflet } from '../../lib/useLeaflet'
import { useThemeMode } from '../../lib/useThemeMode'

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const CITY_KEYS = Object.keys(CITY_COORDS)

function tileUrlForMode(mode) {
  return mode === 'light' ? TILE_LIGHT : TILE_DARK
}

export function getCity(title) {
  const t = String(title || '').toLowerCase()

  // Prefer explicit normalisations first (vizag, bengaluru, etc.)
  for (const [needle, canonical] of Object.entries(CITY_NORMALISE)) {
    if (t.includes(needle)) return canonical
  }

  // Fall back to direct city name substring matching.
  for (const city of CITY_KEYS) {
    if (t.includes(city.toLowerCase())) return city
  }

  return null
}

export default function NewsMap({
  cityHasNews = {},
  selectedCity = null,
  onSelectCity,
  centerCoords,
}) {
  const mapElRef = useRef(null)
  const mapInstRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)

  const { L, loaded } = useLeaflet()
  const themeMode = useThemeMode()

  useEffect(() => {
    if (!loaded || !L) return
    if (!mapElRef.current || mapInstRef.current) return

    const map = L.map(mapElRef.current, {
      center: centerCoords || [22.5, 78.5],
      zoom: 4,
      zoomControl: false,
      maxBounds: [
        [6.5, 68],
        [35.5, 97],
      ],
      attributionControl: false,
    })
    mapInstRef.current = map

    tileLayerRef.current = L.tileLayer(tileUrlForMode(themeMode), {
      attribution: 'OpenStreetMap / CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)

    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    return () => {
      tileLayerRef.current = null
      markersLayerRef.current = null
      if (mapInstRef.current) {
        mapInstRef.current.remove()
        mapInstRef.current = null
      }
    }
  }, [loaded, L, centerCoords, themeMode])

  useEffect(() => {
    if (!loaded || !L) return
    const map = mapInstRef.current
    const tile = tileLayerRef.current
    const markers = markersLayerRef.current
    if (!map || !tile || !markers) return

    tile.setUrl(tileUrlForMode(themeMode))

    markers.clearLayers()
    Object.entries(CITY_COORDS).forEach(([city, coords]) => {
      const hasNews = !!cityHasNews[city]
      const isSelected = selectedCity === city

      const iconHtml = `
        <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
          <div style="
            width:12px; height:12px;
            border-radius:9999px;
            background:var(--accent);
            border:2px solid var(--bg-base);
            box-shadow:0 0 12px var(--accent-glow);
            transform:${isSelected ? 'scale(1.18)' : 'scale(1)'};
            transition:transform var(--dur-fast) var(--ease-out);
          "></div>
          ${hasNews ? '<div style="position:absolute; inset:0; border-radius:9999px; box-shadow:0 0 0 1px var(--accent-glow), 0 0 22px var(--accent-glow); opacity:0.55;"></div>' : ''}
        </div>
      `

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker([coords.lat, coords.lng], { icon })
      marker.on('click', () => onSelectCity?.(city))
      marker.addTo(markers)
    })
  }, [loaded, L, themeMode, cityHasNews, selectedCity, onSelectCity])

  return (
    <div
      ref={mapElRef}
      className="w-full h-full min-h-[400px] lg:min-h-full bg-bg-inset rounded-[var(--radius-lg)] overflow-hidden"
    />
  )
}

