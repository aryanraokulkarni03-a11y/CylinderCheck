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
