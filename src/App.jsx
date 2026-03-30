// src/App.jsx
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  MessageSquare,
  Newspaper,
  Store,
  Target,
} from 'lucide-react'

import { supabase } from './supabaseClient'
import { springs } from './lib/springs'
import {
  CITY_NORMALISE,
  CITY_STATE_LABELS,
  LPG_PRODUCT_TYPES,
  addDays,
  buildCommunityInsight,
  buildDeliveryEstimate,
  buildDeliveryEstimateFromSnapshot,
  buildSupplyPressure,
  buildSupplyPressureFromSnapshot,
  computeUrgency,
  daysUntil,
  lookupPIN,
  resolveCommercialSeoCitySlug,
  resolveHouseholdSeoCitySlug,
} from './lib/utils'

import AppShell from './components/layout/AppShell'
import { Topbar } from './components/layout/Topbar'
import { BottomNav } from './components/layout/BottomNav'
import { Footer } from './components/layout/Footer'

import HomePage from './features/home/HomePage'
const TrackTab = lazy(() => import('./features/track/TrackTab'))
const ReportsTab = lazy(() => import('./features/reports/ReportsTab'))
const NewsTab = lazy(() => import('./features/news/NewsTab'))
const NewsArticlePage = lazy(() => import('./features/news/NewsArticlePage'))
const AlertsTab = lazy(() => import('./features/alerts/AlertsTab'))
const CommercialPage = lazy(() => import('./features/commercial/CommercialPage'))
const CommercialCitySEOPage = lazy(() => import('./features/commercial/CommercialCitySEOPage'))
const AdminTab = lazy(() => import('./features/admin/AdminTab'))
const AdminEditorialPage = lazy(() => import('./features/admin/AdminEditorialPage'))
const CitySEOPage = lazy(() => import('./features/seo/CitySEOPage'))
const CitiesDirectoryPage = lazy(() => import('./features/seo/CitiesDirectoryPage'))
import AdminModal from './features/admin/AdminModal'
const SupportPage = lazy(() => import('./features/support/SupportPage'))
const PrivacyPage = lazy(() => import('./features/legal/PrivacyPage'))
const TermsPage = lazy(() => import('./features/legal/TermsPage'))
const AuthCallbackPage = lazy(() => import('./features/auth/AuthCallbackPage'))
const AccountPage = lazy(() => import('./features/account/AccountPage'))
import SeoHead from './components/seo/SeoHead'
import { getRouteMetadata } from './lib/metadata'
import { identifyUser, resetIdentity, trackEvent, trackPageView } from './lib/analytics.js'

const TABS = [
  { id: 'track', label: 'Track', icon: Target },
  { id: 'reports', label: 'Reports', icon: MessageSquare },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'commercial', label: 'For Biz', icon: Store },
]

const TAB_ROUTES = {
  track: '/track',
  reports: '/reports',
  // Legacy id (pre-routing).
  community: '/reports',
  news: '/news',
  alerts: '/alerts',
  commercial: '/business',
  admin: '/admin',
  support: '/support',
  privacy: '/privacy',
  terms: '/terms',
  account: '/account',
  authCallback: '/auth/callback',
}

const CONTENT_ROUTES = {
  bangalorePrice: '/bangalore-lpg-price',
  bangaloreDelivery: '/bangalore-lpg-delivery-time',
  bangaloreCommercial: '/bangalore-commercial-lpg',
}

const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const NOTIFY_TIMEOUT_MS = 4000

function formatTrackLocationLabel(city, state) {
  const cityPart = String(city || '').trim()
  const statePart = String(state || '').trim()
  if (cityPart && statePart) return `${cityPart}, ${statePart}`
  if (cityPart) return cityPart
  if (statePart) return statePart
  return ''
}

async function fetchDomesticPressureSummaryRows() {
  const result = await supabase
    .from('pin_track_summary_v1')
    .select('*')
    .in('pressure_level', ['active', 'severe', 'building'])

  if (result.error || !Array.isArray(result.data)) {
    return result
  }

  const hasProductSplit = result.data.some((row) => Object.hasOwn(row, 'pressure_product_type'))
  const data = hasProductSplit
    ? result.data.filter((row) => row.pressure_product_type === LPG_PRODUCT_TYPES.domestic_14_2kg)
    : result.data

  return { data, error: null }
}

async function fetchDomesticTrackSummary(pin) {
  const result = await supabase
    .from('pin_track_summary_v1')
    .select('*')
    .eq('pin', pin)
    .limit(4)

  if (result.error || !Array.isArray(result.data)) {
    return result
  }

  if (!result.data.length) {
    return { data: null, error: null }
  }

  const hasProductSplit = result.data.some((row) => Object.hasOwn(row, 'delivery_product_type'))
  const data = hasProductSplit
    ? result.data.find((row) => row.delivery_product_type === LPG_PRODUCT_TYPES.domestic_14_2kg) || result.data[0]
    : result.data[0]

  return { data, error: null }
}

function RouteScrollManager({ pathname, search, hash }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return undefined

    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (hash) return

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search, hash])

  return null
}

function SeoRouteSwitch({ mapPrices, pricesUpdatedAt, householdSeoCities, householdSeoCitiesLoaded }) {
  const { pathname } = useLocation()

  if (pathname.startsWith('/commercial-lpg-price-in-')) {
    const commercialSlug = pathname.slice('/commercial-lpg-price-in-'.length)
    const commercialCity = resolveCommercialSeoCitySlug(commercialSlug)

    if (!commercialCity) {
      return <Navigate to={TAB_ROUTES.commercial} replace />
    }

    if (commercialSlug !== commercialCity.canonicalSlug) {
      return <Navigate to={`/commercial-lpg-price-in-${commercialCity.canonicalSlug}`} replace />
    }

    return (
      <CommercialCitySEOPage
        mapPrices={mapPrices}
        pricesUpdatedAt={pricesUpdatedAt}
        productType={LPG_PRODUCT_TYPES.commercial_19kg}
      />
    )
  }

  if (!pathname.startsWith('/lpg-price-in-')) {
    return <Navigate to={TAB_ROUTES.track} replace />
  }

  if (!householdSeoCitiesLoaded) {
    return <RouteFallback pathname={pathname} />
  }

  const householdSlug = pathname.slice('/lpg-price-in-'.length)
  const householdCity = resolveHouseholdSeoCitySlug(householdSlug, householdSeoCities)
  if (!householdCity) {
    return <Navigate to={TAB_ROUTES.track} replace />
  }

  if (householdSlug !== householdCity.canonicalSlug) {
    return <Navigate to={`/lpg-price-in-${householdCity.canonicalSlug}`} replace />
  }

  return <CitySEOPage />
}

function RouteFallback({ pathname }) {
  const isRailLayout = pathname.startsWith('/news')
  const isDualLayout =
    pathname.startsWith('/lpg-price-in-') ||
    pathname.startsWith('/commercial-lpg-price-in-') ||
    pathname === '/cities' ||
    pathname === '/business'

  const layoutClass = isRailLayout
    ? 'route-fallback__frame--rail'
    : isDualLayout
      ? 'route-fallback__frame--dual'
      : 'route-fallback__frame--single'

  return (
    <div className="route-fallback page-root" aria-hidden="true">
      <div className="route-fallback__header card">
        <div className="route-fallback__eyebrow" />
        <div className="route-fallback__title" />
        <div className="route-fallback__copy route-fallback__copy--wide" />
        <div className="route-fallback__copy" />
      </div>

      <div className={`route-fallback__frame ${layoutClass}`}>
        <div className="route-fallback__card">
          <div className="route-fallback__line route-fallback__line--label" />
          <div className="route-fallback__line route-fallback__line--title" />
          <div className="route-fallback__line route-fallback__line--medium" />
          <div className="route-fallback__line" />
        </div>

        <div className="route-fallback__card">
          <div className="route-fallback__line route-fallback__line--label" />
          <div className="route-fallback__panel">
            <span className="route-fallback__chip" />
            <span className="route-fallback__chip route-fallback__chip--short" />
          </div>
          <div className="route-fallback__line route-fallback__line--medium" />
          <div className="route-fallback__line route-fallback__line--short" />
        </div>

        {isDualLayout || isRailLayout ? (
          <div className="route-fallback__card route-fallback__card--wide">
            <div className="route-fallback__line route-fallback__line--label" />
            <div className="route-fallback__line route-fallback__line--title" />
            <div className="route-fallback__stack">
              <div className="route-fallback__line route-fallback__line--medium" />
              <div className="route-fallback__line" />
              <div className="route-fallback__line route-fallback__line--short" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function App() {
  const shouldReduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const routerLocation = useLocation()

  // Track page views on route change
  useEffect(() => {
    trackPageView(`${routerLocation.pathname || '/'}${routerLocation.search || ''}`)
  }, [routerLocation.pathname, routerLocation.search])

  // Track tab state
  const [pin, setPin] = useState('')
  const [lastBooking, setLastBooking] = useState('')
  const [pinData, setPinData] = useState(null)
  const [bookingResult, setBookingResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cylinderLevel, setCylinderLevel] = useState(null)
  const [trackResultToken, setTrackResultToken] = useState(0)
  const resultRef = useRef(null)

  // Prices + national summary (used on Track tab)
  const [mapPrices, setMapPrices] = useState({})
  const [shortageSummary, setShortageSummary] = useState(null)
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState(null)
  const [householdSeoCities, setHouseholdSeoCities] = useState([])
  const [householdSeoCitiesLoaded, setHouseholdSeoCitiesLoaded] = useState(false)

  // Auth
  const [user, setUser] = useState(null)
  const [authSession, setAuthSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Admin (logo Easter egg)
  const [logoClicks, setLogoClicks] = useState(0)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminData, setAdminData] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // UI
  const [authError, setAuthError] = useState('')
  const pendingFirstSignInEmailRef = useRef(false)
  const lastNotifiedUserRef = useRef('')

  const notifyFirstSignIn = useCallback(async (session) => {
    const accessToken = session?.access_token
    const userId = session?.user?.id || ''

    if (!accessToken || !userId || pendingFirstSignInEmailRef.current) return
    if (lastNotifiedUserRef.current === userId) return

    pendingFirstSignInEmailRef.current = true
    lastNotifiedUserRef.current = userId

    try {
      const timeout = window.setTimeout(() => {
        pendingFirstSignInEmailRef.current = false
      }, NOTIFY_TIMEOUT_MS)

      try {
        const { error } = await supabase.functions.invoke('notify-sign-in', {
          body: {
            source: 'google-oauth',
            accessToken,
          },
        })

        if (error) {
          console.error('notify-sign-in invoke failed:', error)
          lastNotifiedUserRef.current = ''
          return
        }
      } finally {
        window.clearTimeout(timeout)
      }

    } finally {
      pendingFirstSignInEmailRef.current = false
    }
  }, [])

  const handleGoogleSignIn = useCallback(async (fallbackPath) => {
    setAuthError('')
    trackEvent('Sign In Initiated', { provider: 'google' })

    const currentPath = `${routerLocation.pathname || ''}${routerLocation.search || ''}`
    const requestedPath =
      typeof fallbackPath === 'string' && fallbackPath.startsWith('/')
        ? fallbackPath
        : currentPath && currentPath.startsWith('/')
          ? currentPath
          : TAB_ROUTES.track

    try {
      localStorage.setItem('cc-post-auth-path', requestedPath)
    } catch {
      // Private mode.
    }

    try {
      const callbackUrl = new URL(TAB_ROUTES.authCallback, window.location.origin)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        console.error('Supabase OAuth error:', error)
        trackEvent('Sign In Failed', { provider: 'google', reason: 'supabase_error', message: error.message })
        setAuthError(
          'Google sign-in is not available right now. Check the provider setup and try again shortly.',
        )
        return false
      }

      if (!data?.url) {
        trackEvent('Sign In Failed', { provider: 'google', reason: 'no_url_returned' })
        setAuthError(
          'Google sign-in is not available right now. Check the provider setup and try again shortly.',
        )
        return false
      }

      window.location.assign(data.url)
      return true
    } catch (error) {
      console.error('Sign in failed:', error)
      trackEvent('Sign In Failed', { provider: 'google', reason: 'exception', message: error.message })
      setAuthError(
        'Google sign-in is not available right now. Check the provider setup and try again shortly.',
      )
      return false
    }
  }, [routerLocation.pathname, routerLocation.search])

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      lastNotifiedUserRef.current = ''
      setAuthError('')
      resetIdentity()
      navigate(TAB_ROUTES.track, { replace: true })
    }
  }, [navigate])

  // Auth effect
  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
        setAuthSession(session ?? null)
        setUser(session?.user ?? null)
        setAuthLoading(false)
        if (session?.user) {
          setAuthError('')
          identifyUser(session.user.id)
      } else {
        resetIdentity()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      setAuthSession(session ?? null)
      setUser(session?.user ?? null)
      if (session?.user) {
        setAuthError('')
        identifyUser(session.user.id)
      } else {
        resetIdentity()
      }
      if (event === 'SIGNED_IN' && session) {
        trackEvent('Sign In Success', { provider: 'google' })
        void notifyFirstSignIn(session)
      }
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [notifyFirstSignIn])

  useEffect(() => {
    if (authLoading || !authSession?.access_token || !user?.id) return
    void notifyFirstSignIn(authSession)
  }, [authLoading, authSession, notifyFirstSignIn, user?.id])

  // Prices + shortage summary effect
  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const { data: prices } = await supabase
          .from('lpg_prices')
          .select('*')
          .order('recorded_at', { ascending: false })

        if (!cancelled) {
          if (prices?.length) {
            const grouped = {}
            for (const row of prices) {
              grouped[row.city] ||= {}
              // We only want the latest entry per city/product type (query is sorted desc).
              if (!grouped[row.city][row.product_type]) {
                grouped[row.city][row.product_type] = {
                  price: row.price,
                  state: row.state || CITY_STATE_LABELS[row.city] || '',
                  sourceUrl: row.source_url || '',
                  recordedAt: row.recorded_at || null,
                }
              }
            }
            setMapPrices(grouped)
            setPricesUpdatedAt(prices[0]?.recorded_at || null)
          } else {
            setMapPrices({})
            setPricesUpdatedAt(null)
          }
        }

        const { data: pressureData } = await fetchDomesticPressureSummaryRows()

        if (!cancelled) {
          if (!pressureData?.length) {
            setShortageSummary(null)
            return
          }

          const rowsWithReports = pressureData.filter((row) => (row.report_count_30d || 0) > 0)
          const hot = [...(rowsWithReports.length ? rowsWithReports : pressureData)]
            .sort((a, b) => {
              const reportDelta = (b.report_count_30d || 0) - (a.report_count_30d || 0)
              if (reportDelta !== 0) return reportDelta
              return (b.pressure_score || 0) - (a.pressure_score || 0)
            })[0]

          setShortageSummary({
            activePinCount: pressureData.length,
            totalReports: pressureData.reduce((acc, row) => acc + (row.report_count_30d || 0), 0),
            hotspot: rowsWithReports.length ? (hot.city || `PIN ${hot.pin}`) : '',
            hotspotReports: rowsWithReports.length ? (hot.report_count_30d || 0) : 0,
          })
        }
      } catch {
        if (!cancelled) setShortageSummary(null)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadHouseholdSeoCities() {
      const { data, error } = await supabase
        .from('city_registry')
        .select('city_key, city_name, canonical_slug, state_name, price_source_slug, aliases')
        .eq('household_seo_enabled', true)
        .order('display_priority', { ascending: true })

      if (cancelled) return

      if (error || !Array.isArray(data)) {
        setHouseholdSeoCities([])
      } else {
        setHouseholdSeoCities(data)
      }

      setHouseholdSeoCitiesLoaded(true)
    }

    loadHouseholdSeoCities()

    return () => {
      cancelled = true
    }
  }, [])

  // Handlers (track + admin unlock). Keep backend interactions intact.
  const handleTrack = useCallback(async () => {
    if (!pin || pin.length !== 6) {
      setError('Enter a valid 6-digit PIN code.')
      trackEvent('Track PIN Attempt', { pin, success: false, reason: 'invalid_format' })
      return
    }
    setError('')
    setLoading(true)
    setPinData(null)
    setBookingResult(null)

    const [
      trackSummaryResult,
      { data: dbData },
      location,
      { data: recentReports },
      { data: verifiedSignals },
      { data: rpcAvgData },
    ] = await Promise.all([
      fetchDomesticTrackSummary(pin),
      supabase.from('pin_data').select('*').eq('pin', pin).maybeSingle(),
      lookupPIN(pin),
      supabase.from('reports').select('id, created_at, delivery_days').eq('pin', pin)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('pin_user_signals')
        .select('created_at, delivery_days, pressure_level')
        .eq('pin', pin)
        .eq('active', true)
        .gt('expires_at', new Date().toISOString()),
      supabase.rpc('get_avg_delivery_days', { p_pin: pin }),
    ])

    const trackSummary = trackSummaryResult?.error ? null : trackSummaryResult?.data

    const reportCount = recentReports?.length || 0
    const last7 = (recentReports || []).filter(
      (r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)
    ).length
    const prior7 = reportCount - last7
    const verifiedPressureSignals = (verifiedSignals || [])
      .map((signal) => signal.pressure_level)
      .filter(Boolean)

    const avgDays = typeof dbData?.avg_days === 'number'
      ? dbData.avg_days
      : (typeof rpcAvgData === 'number' ? rpcAvgData : null)

    const deliverySignals = [
      ...(recentReports || []).map((report) => report.delivery_days),
      ...(verifiedSignals || []).map((signal) => signal.delivery_days),
    ]
      .filter((value) => Number.isFinite(value))

    const deliveryEstimate =
      buildDeliveryEstimateFromSnapshot(trackSummary) ||
      buildDeliveryEstimate({
        avgDays,
        deliverySignals,
      })

    const supplyPressure =
      buildSupplyPressureFromSnapshot(trackSummary) ||
      buildSupplyPressure({
        reportCount,
        last7,
        prior7,
        deliveryEstimate,
        verifiedPressureSignals,
      })

    const verifiedDistributorLabel =
      trackSummary?.distributor_verification_status === 'verified'
        ? trackSummary?.distributor_name
        : null
    const communityInsight = buildCommunityInsight({
      signals: verifiedSignals || [],
      snapshot: trackSummary,
    })

    const cityLabel = location
      ? formatTrackLocationLabel(location.city, location.state)
      : formatTrackLocationLabel(trackSummary?.city, trackSummary?.state) || dbData?.city || `PIN ${pin}`

    const builtPinData = dbData
      ? {
          ...dbData,
          avg_days: avgDays ?? '\u2014',
          city: cityLabel,
          area: location?.area || trackSummary?.area || '',
          reportCount,
          last7ReportCount: last7,
          prior7ReportCount: prior7,
            deliveryEstimate,
            supplyPressure,
            communityInsight,
            verifiedAgencyLabel: verifiedDistributorLabel,
          }
      : {
          pin,
          city: cityLabel,
          area: location?.area || trackSummary?.area || '',
          agency: 'Check with local agency',
          avg_days: avgDays ?? '\u2014',
          reportCount,
          last7ReportCount: last7,
          prior7ReportCount: prior7,
          deliveryEstimate,
          supplyPressure,
          communityInsight,
          verifiedAgencyLabel: verifiedDistributorLabel,
        }

    // Compute urgency score when cylinder level is known
    const dLeft = lastBooking ? daysUntil(addDays(new Date(lastBooking), 25)) : null
    if (cylinderLevel) {
      builtPinData.urgencyScore = computeUrgency({
        cylinderLevel,
        daysLeft: dLeft,
        reportCount,
        avgDays: typeof deliveryEstimate.typicalDays === 'number' ? deliveryEstimate.typicalDays : 5,
      })
    }

    trackEvent('Track PIN Attempt', {
      pinPrefix3: pin.slice(0, 3),
      success: !trackSummaryResult?.error,
      city: cityLabel,
    })

    setPinData(builtPinData)
    setTrackResultToken((token) => token + 1)

    if (lastBooking) {
      const nw = addDays(new Date(lastBooking), 25)
      setBookingResult({ nextWindow: nw, daysLeft: daysUntil(nw) })
    }

    setLoading(false)
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' })
    }, 80)
  }, [pin, lastBooking, cylinderLevel])

  const handleLogoClick = useCallback(() => {
    const next = logoClicks + 1
    setLogoClicks(next)
    if (next >= 5) {
      setLogoClicks(0)
      setShowAdminPrompt(true)
    }
    navigate('/', { replace: routerLocation.pathname === '/' })
  }, [logoClicks, navigate, routerLocation.pathname])

  const handleAdminUnlock = useCallback(async (password) => {
    setAdminLoading(true)
    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/get-admin-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ admin_password: password }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setShowAdminPrompt(false)
        setAdminUnlocked(true)
        trackEvent('Admin Easter Egg Unlocked')
        navigate(TAB_ROUTES.admin)
        setAdminData(data)
        setAdminLoading(false)
        return true
      }
    } catch {
      // silent
    }
    setAdminLoading(false)
    return false
  }, [navigate])

  const handleAdminLock = useCallback(() => {
    setAdminUnlocked(false)
    navigate(TAB_ROUTES.track, { replace: true })
  }, [navigate])

  const visibleTabs = adminUnlocked
    ? [...TABS, { id: 'admin', label: 'Admin', icon: Target }]
    : TABS

  const rawCity = pinData?.city ? pinData.city.split(',')[0].trim() : ''
  const normalizedCity = rawCity
    ? (CITY_NORMALISE[rawCity.toLowerCase()] || rawCity)
    : ''

  const activeTab = (() => {
    const p = routerLocation.pathname || '/'
    if (p === '/') return null
    if (p.startsWith('/track')) return 'track'
    if (p.startsWith('/reports')) return 'reports'
    if (p.startsWith('/news')) return 'news'
    if (p.startsWith('/alerts')) return 'alerts'
    if (p.startsWith('/business') || p.startsWith('/commercial')) return 'commercial'
    if (p.startsWith('/admin')) return 'admin'
    return null
  })()

  const seoMetadata = getRouteMetadata(routerLocation.pathname || '/', {
    householdSeoCities,
    householdSeoCitiesLoaded,
  })

  const handleTabChange = useCallback((nextTab) => {
    trackEvent('Tab Navigated', { tab: nextTab })
    const to = TAB_ROUTES[nextTab]
    if (to) navigate(to)
  }, [navigate])

  const trackProps = {
    pin,
    setPin,
    lastBooking,
    setLastBooking,
    pinData,
    bookingResult,
    loading,
    error,
    cylinderLevel,
    setCylinderLevel,
    trackResultToken,
    handleTrack,
    resultRef,
    shortageSummary,
    mapPrices,
    pricesUpdatedAt,
    user,
    authLoading,
    onGoogleSignIn: handleGoogleSignIn,
    onCommercialClick: () => navigate(TAB_ROUTES.commercial),
    onReportIssue: (prefill) => navigate(TAB_ROUTES.reports, { state: { reportPrefill: prefill } }),
  }

  const homeProps = {
    pin,
    setPin,
    lastBooking,
    setLastBooking,
    mapPrices,
    pricesUpdatedAt,
    shortageSummary,
    onPrimaryCheck: () => navigate(TAB_ROUTES.track, { state: { autoRunTrack: true } }),
  }

  useEffect(() => {
    if (routerLocation.pathname !== TAB_ROUTES.track || !routerLocation.state?.autoRunTrack) return

    navigate(TAB_ROUTES.track, { replace: true, state: {} })

    if (pin && pin.length === 6) {
      void handleTrack()
    }
  }, [routerLocation.pathname, routerLocation.state, navigate, pin, handleTrack])

  return (
    <>
      <RouteScrollManager
        pathname={routerLocation.pathname}
        search={routerLocation.search}
        hash={routerLocation.hash}
      />
      <SeoHead metadata={seoMetadata} />
      <AppShell
        topbar={
          <Topbar
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            user={user}
            authLoading={authLoading}
            authError={authError}
            logoClicks={logoClicks}
            onLogoClick={handleLogoClick}
            onDismissAuthError={() => setAuthError('')}
            onGoogleSignIn={handleGoogleSignIn}
            onAccountClick={() => navigate(TAB_ROUTES.account)}
            userEmail={user?.email || ''}
          />
        }
        bottomNav={<BottomNav tabs={visibleTabs} activeTab={activeTab} onTabChange={handleTabChange} />}
        footer={<Footer />}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={routerLocation.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
          >
            <Suspense fallback={<RouteFallback pathname={routerLocation.pathname || '/'} />}>
              <Routes location={routerLocation}>
                <Route path="/" element={<HomePage {...homeProps} />} />
                <Route path={TAB_ROUTES.track} element={<TrackTab {...trackProps} />} />
                <Route
                  path={TAB_ROUTES.reports}
                  element={
                    <ReportsTab
                      user={user}
                      authLoading={authLoading}
                      onGoogleSignIn={handleGoogleSignIn}
                      onTrackBack={() => navigate(TAB_ROUTES.track)}
                    />
                  }
                />
                <Route path={TAB_ROUTES.news} element={<NewsTab />} />
                <Route path="/news/:slug" element={<NewsArticlePage />} />
                <Route path={TAB_ROUTES.alerts} element={<AlertsTab user={user} authLoading={authLoading} />} />
                <Route
                  path={TAB_ROUTES.commercial}
                  element={
                    <CommercialPage
                      prefilledCity={normalizedCity}
                      mapPrices={mapPrices}
                      pricesUpdatedAt={pricesUpdatedAt}
                      productType={LPG_PRODUCT_TYPES.commercial_19kg}
                    />
                  }
                />
                <Route path="/commercial" element={<Navigate to={TAB_ROUTES.commercial} replace />} />
                <Route
                  path="/:cityPageSlug"
                  element={
                    <SeoRouteSwitch
                      mapPrices={mapPrices}
                      pricesUpdatedAt={pricesUpdatedAt}
                      householdSeoCities={householdSeoCities}
                      householdSeoCitiesLoaded={householdSeoCitiesLoaded}
                    />
                  }
                />
                <Route path="/cities" element={<CitiesDirectoryPage />} />
                <Route
                  path={CONTENT_ROUTES.bangalorePrice}
                  element={<Navigate to="/lpg-price-in-bangalore" replace />}
                />
                <Route
                  path={CONTENT_ROUTES.bangaloreDelivery}
                  element={<Navigate to="/lpg-price-in-bangalore" replace />}
                />
                <Route
                  path={CONTENT_ROUTES.bangaloreCommercial}
                  element={<Navigate to="/lpg-price-in-bangalore" replace />}
                />
                <Route path={TAB_ROUTES.support} element={<SupportPage />} />
                <Route path={TAB_ROUTES.privacy} element={<PrivacyPage />} />
                <Route path={TAB_ROUTES.terms} element={<TermsPage />} />
                <Route
                  path={TAB_ROUTES.account}
                  element={
                    <AccountPage
                      user={user}
                      authLoading={authLoading}
                      onGoogleSignIn={handleGoogleSignIn}
                      onSignOut={handleSignOut}
                    />
                  }
                />
                <Route path={TAB_ROUTES.authCallback} element={<AuthCallbackPage user={user} />} />
                <Route
                  path="/admin/editorial"
                  element={
                    adminUnlocked ? (
                      <AdminEditorialPage
                        user={user}
                        authLoading={authLoading}
                        onGoogleSignIn={handleGoogleSignIn}
                        onBack={() => navigate(TAB_ROUTES.admin)}
                        onLock={handleAdminLock}
                      />
                    ) : (
                      <Navigate to={TAB_ROUTES.track} replace />
                    )
                  }
                />
                <Route
                  path={TAB_ROUTES.admin}
                  element={
                    adminUnlocked ? (
                      <AdminTab
                        data={adminData}
                        loading={adminLoading}
                        user={user}
                        authLoading={authLoading}
                        onOpenEditorial={() => navigate('/admin/editorial')}
                        onLock={handleAdminLock}
                      />
                    ) : (
                      <Navigate to={TAB_ROUTES.track} replace />
                    )
                  }
                />
                <Route path="*" element={<Navigate to={TAB_ROUTES.track} replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </AppShell>

      {/* Admin unlock modal (Easter egg) */}
      <AdminModal
        isOpen={showAdminPrompt}
        onClose={() => setShowAdminPrompt(false)}
        onUnlock={handleAdminUnlock}
        loading={adminLoading}
      />
    </>
  )
}

