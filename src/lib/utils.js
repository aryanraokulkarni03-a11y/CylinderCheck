// src/lib/utils.js
// Utility functions — preserved from original App.jsx

export const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export const fmt = (d) =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

export const daysUntil = (d) => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.ceil((d - t) / 86400000)
}

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

export const lookupPIN = async (pin) => {
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    const j = await r.json()
    if (j[0]?.Status === 'Success' && j[0]?.PostOffice?.length > 0) {
      const po = j[0].PostOffice[0]
      return { city: po.District, state: po.State, area: po.Name }
    }
  } catch { /* ignore */ }
  return null
}

export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

// City data constants
export const CITY_COORDS = {
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Mumbai:    { lat: 19.0760, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Kochi:     { lat: 9.9312, lng: 76.2673 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Vizag:     { lat: 17.6868, lng: 83.2185 },
  Jaipur:    { lat: 26.9124, lng: 75.7873 },
  Lucknow:   { lat: 26.8467, lng: 80.9462 },
  Patna:     { lat: 25.5941, lng: 85.1376 },
  Ranchi:    { lat: 23.3441, lng: 85.3096 },
}

export const CITY_STATE_LABELS = {
  Delhi: 'Delhi',
  Mumbai: 'Maharashtra',
  Bangalore: 'Karnataka',
  Hyderabad: 'Telangana',
  Chennai: 'Tamil Nadu',
  Kochi: 'Kerala',
  Pune: 'Maharashtra',
  Kolkata: 'West Bengal',
  Ahmedabad: 'Gujarat',
  Vizag: 'Andhra Pradesh',
  Jaipur: 'Rajasthan',
  Lucknow: 'Uttar Pradesh',
  Patna: 'Bihar',
  Ranchi: 'Jharkhand',
}

export const LPG_PRODUCT_TYPES = {
  domestic_14_2kg: 'domestic_14_2kg',
  commercial_19kg: 'commercial_19kg',
}

export const LPG_PRODUCT_LABELS = {
  [LPG_PRODUCT_TYPES.domestic_14_2kg]: 'Domestic LPG (14.2kg)',
  [LPG_PRODUCT_TYPES.commercial_19kg]: 'Commercial LPG (19kg)',
}

export const COMMERCIAL_CITIES = [
  'Mumbai', 'Bangalore', 'Hyderabad',
  'Chennai', 'Delhi', 'Kolkata', 'Vizag'
]

// Commercial UX shows "states" but vendors are still stored by city (see vendors.city).
export const COMMERCIAL_STATE_BY_CITY = {
  Mumbai: 'Maharashtra',
  Bangalore: 'Karnataka',
  Hyderabad: 'Telangana',
  Chennai: 'Tamil Nadu',
  Delhi: 'Delhi',
  Kolkata: 'West Bengal',
  Vizag: 'Andhra Pradesh',
}

export const COMMERCIAL_STATES = [
  'Maharashtra',
  'Karnataka',
  'Telangana',
  'Tamil Nadu',
  'Delhi',
  'West Bengal',
  'Andhra Pradesh',
]

export const COMMERCIAL_CITIES_BY_STATE = {
  Maharashtra: ['Mumbai'],
  Karnataka: ['Bangalore'],
  Telangana: ['Hyderabad'],
  'Tamil Nadu': ['Chennai'],
  Delhi: ['Delhi'],
  'West Bengal': ['Kolkata'],
  'Andhra Pradesh': ['Vizag'],
}

export function commercialStateForCity(city) {
  return COMMERCIAL_STATE_BY_CITY[String(city || '').trim()] || null
}

export const CITY_NORMALISE = {
  'visakhapatnam': 'Vizag', 'vizag': 'Vizag',
  'bengaluru': 'Bangalore', 'bangalore': 'Bangalore',
  'new delhi': 'Delhi', 'delhi': 'Delhi',
  'calcutta': 'Kolkata', 'kolkata': 'Kolkata',
  'madras': 'Chennai', 'chennai': 'Chennai',
  'kochi': 'Kochi', 'cochin': 'Kochi',
  'bombay': 'Mumbai', 'mumbai': 'Mumbai',
  'ranchi': 'Ranchi',
  'karnataka': 'Bangalore',
  'bihar': 'Patna',
  'jharkhand': 'Ranchi',
  'west bengal': 'Kolkata',
  'maharashtra': 'Mumbai',
  'telangana': 'Hyderabad',
  'andhra pradesh': 'Vizag',
  'rajasthan': 'Jaipur',
  'uttar pradesh': 'Lucknow',
  'gujarat': 'Ahmedabad',
  'tamil nadu': 'Chennai',
  'kerala': 'Kochi',
}

export const COMPANIES = ['IndianOil', 'HP Gas', 'Bharat Gas']
export const COMPANY_EMOJI = {
  IndianOil: '🔵', 'HP Gas': '🟡', 'Bharat Gas': '🟢'
}

export const COMPANY_LABELS = {
  IndianOil: 'Indane',
  'HP Gas': 'HP Gas',
  'Bharat Gas': 'Bharatgas',
}

export const COMPANY_DISCLAIMER = 'Indane (IndianOil), HP Gas, Bharatgas'

export function computeUrgency({ cylinderLevel, daysLeft, reportCount, avgDays }) {
  let score = 0

  // Cylinder level
  const levelScore = { critical: 4, low: 3, half: 2, full: 1 }
  score += levelScore[cylinderLevel] || 0

  // Days to window
  if (daysLeft !== null) {
    if (daysLeft <= 0) score += 4
    else if (daysLeft <= 3) score += 3
    else if (daysLeft <= 7) score += 2
    else score += 1
  }

  // Shortage severity
  if (reportCount >= 5) score += 2
  else if (reportCount >= 2) score += 1
  else if (reportCount === 1) score += 0.5

  // Delivery lag
  if (avgDays > 7) score += 1

  // Hard overrides
  if (cylinderLevel === 'critical' && daysLeft <= 0) return 10
  if (cylinderLevel === 'critical' && daysLeft <= 3) return Math.max(8, Math.round(score))
  if (daysLeft <= 0) return Math.max(6, Math.round(score))
  if (cylinderLevel === 'full' && reportCount === 0) return Math.min(4, Math.round(score))

  return Math.min(10, Math.round(score))
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function percentile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function relativeSignalAge(value) {
  if (!value) return ''
  const date = new Date(value)
  const time = date.getTime()
  if (!Number.isFinite(time)) return ''

  const diffMs = Math.max(0, Date.now() - time)
  const diffHours = Math.round(diffMs / 3600000)
  if (diffHours < 24) return `${Math.max(diffHours, 1)}h ago`

  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays < 30) return `${Math.max(diffDays, 1)}d ago`

  const diffWeeks = Math.round(diffDays / 7)
  return `${Math.max(diffWeeks, 1)}w ago`
}

function freshnessCopy(status) {
  if (status === 'fresh') return 'updated recently'
  if (status === 'aging') return 'updated within the last month'
  return 'based on older history'
}

export function buildDeliveryEstimateFromSnapshot(snapshot) {
  if (!snapshot) return null

  const sampleSize = Number(snapshot.sample_size_30d) || 0
  const sourceScope = snapshot.delivery_source_scope || snapshot.source_scope || 'none'
  const exactSignalCount = Number(snapshot.delivery_exact_signal_count_30d ?? snapshot.exact_signal_count_30d) || 0
  const nearbySignalCount = Number(snapshot.delivery_nearby_signal_count_30d ?? snapshot.nearby_signal_count_30d) || 0
  const low = Number(snapshot.delivery_days_p25)
  const typical = Number(snapshot.delivery_days_median)
  const high = Number(snapshot.delivery_days_p75)
  const historical = Number(snapshot.historical_avg_days)
  const freshness = freshnessCopy(snapshot.delivery_freshness_status)

  if (Number.isFinite(low) && Number.isFinite(high) && Number.isFinite(typical)) {
    const lowDays = Math.max(1, Math.floor(low))
    const highDays = Math.max(lowDays, Math.ceil(high))
    const note =
      sourceScope === 'nearby'
        ? `Based on ${Math.max(nearbySignalCount, sampleSize)} nearby verified delivery ${pluralize(Math.max(nearbySignalCount, sampleSize), 'signal')} and ${freshness}.`
        : sourceScope === 'local' && exactSignalCount > 0 && nearbySignalCount > 0
          ? `Based on local delivery reports, ${exactSignalCount} exact-PIN ${pluralize(exactSignalCount, 'signal')}, nearby corroboration, and ${freshness}.`
        : exactSignalCount > 0
          ? `Based on local delivery reports, ${exactSignalCount} verified ${pluralize(exactSignalCount, 'signal')}, and ${freshness}.`
          : sampleSize > 0
            ? `Based on ${sampleSize} local delivery ${pluralize(sampleSize, 'report')} and ${freshness}.`
            : `Based on local delivery evidence and ${freshness}.`
    return {
      kind: 'snapshot',
      summary: lowDays === highDays ? `About ${lowDays} ${pluralize(lowDays, 'day')}` : `Usually ${lowDays}-${highDays} days`,
      note,
      bookingCopy:
        lowDays === highDays
          ? `a local delivery estimate of about ${lowDays} ${pluralize(lowDays, 'day')}`
          : `a local delivery estimate of ${lowDays}-${highDays} days`,
      typicalDays: Math.max(1, Math.round(typical)),
      sampleSize,
      confidence: snapshot.delivery_confidence_level || 'medium',
    }
  }

  if (Number.isFinite(historical)) {
    const typicalDays = Math.max(1, Math.round(historical))
    return {
      kind: 'historical',
      summary: `About ${typicalDays} ${pluralize(typicalDays, 'day')}`,
      note: `Based on historical PIN-level delivery data and ${freshness}.`,
      bookingCopy: `a historical delivery estimate of about ${typicalDays} ${pluralize(typicalDays, 'day')}`,
      typicalDays,
      sampleSize,
      confidence: snapshot.delivery_confidence_level || 'low',
    }
  }

  return null
}

export function buildDeliveryEstimate({ avgDays, deliverySignals = [] }) {
  const cleanSignals = deliverySignals
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 30)

  if (cleanSignals.length >= 3) {
    const low = Math.max(1, Math.floor(percentile(cleanSignals, 0.25) || 0))
    const high = Math.max(low, Math.ceil(percentile(cleanSignals, 0.75) || low))
    const typicalDays = Math.max(1, Math.round(median(cleanSignals) || low))

    return {
      kind: 'range',
      summary: low === high ? `About ${low} ${pluralize(low, 'day')}` : `Usually ${low}-${high} days`,
      note: `Based on ${cleanSignals.length} recent local delivery ${pluralize(cleanSignals.length, 'report')}.`,
      bookingCopy:
        low === high
          ? `a local delivery estimate of about ${low} ${pluralize(low, 'day')}`
          : `a local delivery estimate of ${low}-${high} days`,
      typicalDays,
      sampleSize: cleanSignals.length,
      confidence: cleanSignals.length >= 5 ? 'high' : 'medium',
    }
  }

  if (cleanSignals.length > 0) {
    const typicalDays = Math.max(1, Math.round(median(cleanSignals) || cleanSignals[0]))
    return {
      kind: 'single',
      summary: `About ${typicalDays} ${pluralize(typicalDays, 'day')}`,
      note: `Based on ${cleanSignals.length} recent local delivery ${pluralize(cleanSignals.length, 'report')}.`,
      bookingCopy: `a local delivery estimate of about ${typicalDays} ${pluralize(typicalDays, 'day')}`,
      typicalDays,
      sampleSize: cleanSignals.length,
      confidence: 'low',
    }
  }

  if (Number.isFinite(avgDays)) {
    const typicalDays = Math.max(1, Math.round(avgDays))
    return {
      kind: 'historical',
      summary: `About ${typicalDays} ${pluralize(typicalDays, 'day')}`,
      note: 'Based on historical PIN-level delivery data.',
      bookingCopy: `a historical delivery estimate of about ${typicalDays} ${pluralize(typicalDays, 'day')}`,
      typicalDays,
      sampleSize: 0,
      confidence: 'low',
    }
  }

  return {
    kind: 'unknown',
    summary: 'Local evidence is still building',
    note: 'We do not have enough recent delivery data for this PIN yet.',
    bookingCopy: 'current local delivery signals',
    typicalDays: null,
    sampleSize: 0,
    confidence: 'limited',
  }
}

export function buildSupplyPressure({
  reportCount = 0,
  last7 = 0,
  prior7 = 0,
  deliveryEstimate,
  verifiedPressureSignals = [],
}) {
  const deliveryDays = Number(deliveryEstimate?.typicalDays) || 0
  const hasDeliverySignal = deliveryEstimate?.kind && deliveryEstimate.kind !== 'unknown'
  const verifiedSignalScore = verifiedPressureSignals.reduce((total, level) => {
    if (level === 'severe') return total + 20
    if (level === 'active') return total + 14
    if (level === 'building') return total + 8
    if (level === 'low') return total + 2
    return total
  }, 0)

  if (reportCount === 0 && !hasDeliverySignal && verifiedSignalScore === 0) {
    return {
      level: 'limited',
      label: 'Evidence still building',
      note: 'Not enough recent local reports yet to judge supply pressure confidently.',
      status: 'early',
      badgeLabel: 'Limited evidence',
    }
  }

  let score = Math.min(42, last7 * 16)
  score += Math.min(18, Math.max(0, reportCount - last7) * 6)
  score += Math.min(20, verifiedSignalScore)

  if (last7 > prior7 + 1) score += 12
  if (deliveryDays >= 7) score += 10
  if (deliveryDays >= 10) score += 12

  if (score >= 70) {
    return {
      level: 'severe',
      label: 'Severe',
      note: 'Recent local reports and delivery signals both point to strong supply strain.',
      status: 'severe',
      badgeLabel: 'Severe pressure',
    }
  }

  if (score >= 42) {
    return {
      level: 'active',
      label: 'Active',
      note: 'Recent local reports suggest supply pressure is active around this PIN.',
      status: 'active',
      badgeLabel: 'Active pressure',
    }
  }

  if (score >= 20) {
    return {
      level: 'building',
      label: 'Building',
      note: 'There are early local pressure signals, so it is worth checking before you book.',
      status: 'early',
      badgeLabel: 'Building',
    }
  }

  return {
    level: 'low',
    label: 'Low',
    note:
      reportCount > 0
        ? 'Recent local reports are present, but pressure still looks low for now.'
        : 'Recent delivery signals look steady and we have not seen local shortage reports.',
    status: 'clear',
    badgeLabel: 'Low pressure',
  }
}

export function buildSupplyPressureFromSnapshot(snapshot) {
  if (!snapshot?.pressure_level) return null

  const level = snapshot.pressure_level
  const last7 = Number(snapshot.report_count_7d) || 0
  const last30 = Number(snapshot.report_count_30d) || 0
  const trend = snapshot.trend_direction || 'steady'
  const sourceScope = snapshot.pressure_source_scope || snapshot.source_scope || 'none'
  const exactSignalCount = Number(snapshot.pressure_exact_signal_count_30d ?? snapshot.exact_signal_count_30d) || 0
  const nearbySignalCount = Number(snapshot.pressure_nearby_signal_count_30d ?? snapshot.nearby_signal_count_30d) || 0

  if (level === 'limited') {
    return {
      level: 'limited',
      label: 'Evidence still building',
      note: 'Not enough recent local reports yet to judge supply pressure confidently.',
      status: 'early',
      badgeLabel: 'Limited evidence',
    }
  }

  if (level === 'severe') {
    return {
      level: 'severe',
      label: 'Severe',
      note: sourceScope === 'nearby'
        ? `Nearby verified signals suggest strong supply strain${trend === 'rising' ? ' and rising pressure' : ''} around this PIN cluster.`
        : sourceScope === 'mixed'
          ? `Local reports and nearby corroboration both point to strong supply strain${trend === 'rising' ? ' and rising pressure' : ''} around this PIN.`
        : `Recent local reports${exactSignalCount > 0 ? ` and ${exactSignalCount} verified ${pluralize(exactSignalCount, 'signal')}` : ''} are elevated${trend === 'rising' ? ' and still rising' : ''} around this PIN.`,
      status: 'severe',
      badgeLabel: 'Severe pressure',
    }
  }

  if (level === 'active') {
    return {
      level: 'active',
      label: 'Active',
      note: sourceScope === 'nearby'
        ? `Nearby verified signals suggest supply pressure is active around this PIN cluster${trend === 'rising' ? ' and getting stronger' : ''}.`
        : sourceScope === 'mixed'
          ? `Local reports and nearby corroboration suggest supply pressure is active around this PIN${trend === 'rising' ? ' and getting stronger' : ''}.`
        : `Recent local reports${exactSignalCount > 0 ? ` and ${exactSignalCount} verified ${pluralize(exactSignalCount, 'signal')}` : ''} suggest supply pressure is active around this PIN${trend === 'rising' ? ' and getting stronger' : ''}.`,
      status: 'active',
      badgeLabel: 'Active pressure',
    }
  }

  if (level === 'building') {
    return {
      level: 'building',
      label: 'Building',
      note: sourceScope === 'nearby'
        ? `Nearby verified signals${nearbySignalCount > 0 ? ` from ${nearbySignalCount} similar ${pluralize(nearbySignalCount, 'PIN')}` : ''} suggest pressure may be building around this PIN.`
        : sourceScope === 'mixed'
          ? `Light local strain and nearby corroboration suggest pressure may be building around this PIN.`
        : `There are early local pressure signals${last7 > 0 ? ` from ${last7} recent ${pluralize(last7, 'report')}` : exactSignalCount > 0 ? ` from ${exactSignalCount} verified ${pluralize(exactSignalCount, 'signal')}` : ''}, so it is worth checking before you book.`,
      status: 'early',
      badgeLabel: 'Building',
    }
  }

  return {
    level: 'low',
    label: 'Low',
    note: last30 > 0
      ? 'Recent local reports are present, but pressure still looks low for now.'
      : 'Recent delivery signals look steady and we have not seen local shortage reports.',
    status: 'clear',
    badgeLabel: 'Low pressure',
  }
}

export function buildCommunityInsight({ signals = [], snapshot }) {
  const deliveryExactCount = Number(snapshot?.delivery_exact_signal_count_30d) || 0
  const deliveryNearbyCount = Number(snapshot?.delivery_nearby_signal_count_30d) || 0
  const pressureExactCount = Number(snapshot?.pressure_exact_signal_count_30d) || 0
  const pressureNearbyCount = Number(snapshot?.pressure_nearby_signal_count_30d) || 0

  const exactCount = Math.max(deliveryExactCount, pressureExactCount, signals.length)
  const nearbyCount = Math.max(deliveryNearbyCount, pressureNearbyCount)
  const latestSignal = [...signals]
    .filter((signal) => signal?.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

  if (exactCount === 0 && nearbyCount === 0) {
    return {
      summary: 'First local signal',
      note: 'This PIN still needs its first signed-in local read.',
      quote: '',
      isEmpty: true,
      ctaLabel: 'Add the first signal',
    }
  }

  if (exactCount > 0) {
    const notes = signals
      .map((signal) => String(signal?.note || '').trim())
      .filter(Boolean)
    const deliveryCount = signals.filter((signal) => Number.isFinite(Number(signal?.delivery_days))).length
    const pressureCount = signals.filter((signal) => Boolean(signal?.pressure_level)).length

    const fragments = []
    if (deliveryCount > 0) {
      fragments.push(`${deliveryCount} delivery ${pluralize(deliveryCount, 'signal')}`)
    }
    if (pressureCount > 0) {
      fragments.push(`${pressureCount} supply ${pluralize(pressureCount, 'update')}`)
    }
    if (nearbyCount > 0) {
      fragments.push(`${nearbyCount} nearby corroborating ${pluralize(nearbyCount, 'signal')}`)
    }

    return {
      summary: `${exactCount} signed-in local ${pluralize(exactCount, 'signal')}`,
      note: fragments.length
        ? `We already blend ${fragments.join(', ')} into this PIN's planning read${latestSignal?.created_at ? `, most recently ${relativeSignalAge(latestSignal.created_at)}` : ''}.`
        : `Signed-in local signals are already shaping this PIN's planning read${latestSignal?.created_at ? `, most recently ${relativeSignalAge(latestSignal.created_at)}` : ''}.`,
      quote: notes[0] ? `"${notes[0]}"` : '',
      isEmpty: false,
      ctaLabel: '',
    }
  }

  return {
    summary: `${nearbyCount} nearby corroborating ${pluralize(nearbyCount, 'signal')}`,
    note: `Nearby signed-in signals are strengthening this PIN's delivery and supply model even though no exact-PIN community input has landed yet.`,
    quote: '',
    isEmpty: false,
    ctaLabel: '',
  }
}
