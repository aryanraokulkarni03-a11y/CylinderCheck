import { useEffect, useState } from 'react'

function getThemeMode() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark'
}

// Reacts to html[data-theme] updates (ThemeToggle writes this attribute).
export function useThemeMode() {
  const [mode, setMode] = useState(getThemeMode)

  useEffect(() => {
    const root = document.documentElement
    const obs = new MutationObserver(() => setMode(getThemeMode()))
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return mode
}

