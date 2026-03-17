import { useEffect, useState } from 'react'

// Motion rule: hover animations should only run on hover-capable devices.
// On touch devices (common in India), hover states can "stick" and feel buggy.
export function useHoverCapable() {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mql = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = () => setCanHover(!!mql.matches)

    onChange()

    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange)
    else if (typeof mql.addListener === 'function') mql.addListener(onChange)

    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange)
      else if (typeof mql.removeListener === 'function') mql.removeListener(onChange)
    }
  }, [])

  return canHover
}

