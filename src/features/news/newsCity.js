import { CITY_COORDS, CITY_NORMALISE } from '../../lib/utils'

const CITY_KEYS = Object.keys(CITY_COORDS)

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

  const text = String(title || '').toLowerCase()
  const matches = []

  for (const [needle, canonical] of Object.entries(CITY_NORMALISE)) {
    const index = text.indexOf(needle)
    if (index >= 0) {
      matches.push({ city: canonical, index })
    }
  }

  for (const city of CITY_KEYS) {
    const index = text.indexOf(city.toLowerCase())
    if (index >= 0) {
      matches.push({ city, index })
    }
  }

  if (!matches.length) return null

  matches.sort((a, b) => a.index - b.index)
  return matches[0].city
}
