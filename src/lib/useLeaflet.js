import { useEffect, useState } from 'react'

let leafletPromise = null
let leafletCssPromise = null
let leafletInstance = null

async function loadLeaflet() {
  if (leafletInstance) return leafletInstance

  // Load CSS before the map mounts to avoid FOUC.
  if (!leafletCssPromise) {
    leafletCssPromise = import('leaflet/dist/leaflet.css')
  }
  await leafletCssPromise

  const mod = await import('leaflet')
  leafletInstance = mod.default ?? mod
  return leafletInstance
}

/**
 * Shared Leaflet loader.
 * - Uses npm `leaflet` (no CDN / window.L).
 * - Injects Leaflet CSS once (dynamic import).
 * - Returns a stable `L` instance and loaded state.
 */
export function useLeaflet() {
  const [state, setState] = useState(() => ({
    L: leafletInstance,
    loaded: !!leafletInstance,
    error: null,
  }))

  useEffect(() => {
    if (leafletInstance) {
      setState({ L: leafletInstance, loaded: true, error: null })
      return
    }
    if (typeof window === 'undefined') return

    let cancelled = false
    if (!leafletPromise) {
      leafletPromise = loadLeaflet()
    }

    leafletPromise
      .then((L) => {
        if (cancelled) return
        setState({ L, loaded: true, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ L: null, loaded: false, error: err })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
