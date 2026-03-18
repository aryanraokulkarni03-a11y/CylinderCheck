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

function normalizeCityToken(token) {
  const cleaned = String(token || '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .trim()

  if (!cleaned) return null

  for (const [needle, canonical] of Object.entries(CITY_NORMALISE)) {
    if (cleaned === needle || cleaned.includes(needle)) return canonical
  }

  for (const city of CITY_KEYS) {
    if (cleaned === city.toLowerCase()) return city
  }

  return null
}

function getCityFromLink(link) {
  try {
    const url = new URL(String(link || '').trim())
    const parts = url.pathname
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part))

    const cityIndex = parts.findIndex((part) => part.toLowerCase() === 'city')
    if (cityIndex !== -1 && parts[cityIndex + 1]) {
      return normalizeCityToken(parts[cityIndex + 1])
    }

    for (const part of parts) {
      const normalized = normalizeCityToken(part)
      if (normalized) return normalized
    }
  } catch {
    return null
  }

  return null
}

export function getCity(title, link = '') {
  const byLink = getCityFromLink(link)
  if (byLink) return byLink

  const t = String(title || '').toLowerCase()
  const matches = []

  for (const [needle, canonical] of Object.entries(CITY_NORMALISE)) {
    const index = t.indexOf(needle)
    if (index >= 0) {
      matches.push({ city: canonical, index })
    }
  }

  for (const city of CITY_KEYS) {
    const index = t.indexOf(city.toLowerCase())
    if (index >= 0) {
      matches.push({ city, index })
    }
  }

  if (!matches.length) return null

  matches.sort((a, b) => a.index - b.index)
  return matches[0].city
}

export default function NewsMap({
  leadCity = null,
  leadSignalKey = '',
  onSelectCity,
}) {
  const mapElRef = useRef(null)
  const mapInstRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markersLayerRef = useRef(null)
  const pulseResetRef = useRef(null)
  const prevLeadSignalRef = useRef('')

  const { L, loaded } = useLeaflet()
  const themeMode = useThemeMode()

  useEffect(() => {
    if (!loaded || !L) return
    if (!mapElRef.current || mapInstRef.current) return

    const map = L.map(mapElRef.current, {
      center: [22.5, 78.5],
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
  }, [loaded, L, themeMode])

  useEffect(() => {
    if (!loaded || !L) return
    const map = mapInstRef.current
    const tile = tileLayerRef.current
    const markers = markersLayerRef.current
    if (!map || !tile || !markers) return

    tile.setUrl(tileUrlForMode(themeMode))
    map.invalidateSize()

    markers.clearLayers()
    const city = leadCity && CITY_COORDS[leadCity] ? leadCity : null

    if (!city) {
      map.flyTo([22.5, 78.5], 4, {
        animate: true,
        duration: 0.9,
      })
      return
    }

    const coords = CITY_COORDS[city]
    const didLeadChange = leadSignalKey && prevLeadSignalRef.current && prevLeadSignalRef.current !== leadSignalKey
    const shouldPulse = !prevLeadSignalRef.current || didLeadChange
    prevLeadSignalRef.current = leadSignalKey || city

    if (pulseResetRef.current) {
      clearTimeout(pulseResetRef.current)
      pulseResetRef.current = null
    }

    const iconHtml = `
      <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
        <div style="
          position:absolute;
          inset:8px;
          border-radius:9999px;
          background:color-mix(in srgb, var(--accent-glow) 42%, transparent);
          box-shadow:0 0 0 1px color-mix(in srgb, var(--accent-glow) 28%, transparent), 0 0 18px var(--accent-glow);
          opacity:0.72;
        "></div>
        <div style="
          position:absolute;
          inset:0;
          border-radius:9999px;
          border:1px solid color-mix(in srgb, var(--accent-glow) 45%, transparent);
          box-shadow:0 0 20px color-mix(in srgb, var(--accent-glow) 68%, transparent);
          opacity:${shouldPulse ? '0.9' : '0.45'};
          transform:${shouldPulse ? 'scale(0.72)' : 'scale(1)'};
          animation:${shouldPulse ? 'newsLeadPulse 1.35s ease-out 1' : 'none'};
        "></div>
        <div style="
          width:14px;
          height:14px;
          border-radius:9999px;
          background:var(--accent);
          border:2px solid var(--bg-base);
          box-shadow:0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent), 0 0 16px var(--accent-glow);
          position:relative;
          z-index:1;
        "></div>
      </div>
    `

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    })

    const marker = L.marker([coords.lat, coords.lng], { icon, zIndexOffset: 1000 })
    marker.on('click', () => onSelectCity?.(city))
    marker.addTo(markers)

    map.flyTo([coords.lat, coords.lng], 6, {
      animate: true,
      duration: 1,
    })

    if (shouldPulse) {
      pulseResetRef.current = setTimeout(() => {
        pulseResetRef.current = null
      }, 1400)
    }
  }, [loaded, L, themeMode, leadCity, leadSignalKey, onSelectCity])

  useEffect(() => {
    return () => {
      if (pulseResetRef.current) {
        clearTimeout(pulseResetRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={mapElRef}
      className="w-full h-full min-h-[400px] lg:min-h-full bg-bg-inset rounded-[var(--radius-lg)] overflow-hidden"
    />
  )
}
