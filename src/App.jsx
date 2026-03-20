// src/App.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
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
} from './lib/utils'

import AppShell from './components/layout/AppShell'
import { Topbar } from './components/layout/Topbar'
import { BottomNav } from './components/layout/BottomNav'
import { Footer } from './components/layout/Footer'

import TrackTab from './features/track/TrackTab'
import ReportsTab from './features/reports/ReportsTab'
import NewsTab from './features/news/NewsTab'
import AlertsTab from './features/alerts/AlertsTab'
import CommercialPage from './features/commercial/CommercialPage'
import BangaloreGuidePage from './features/seo/BangaloreGuidePage'
import { BANGALORE_GUIDES } from './features/seo/bangaloreGuides'
import AdminTab from './features/admin/AdminTab'
import AdminModal from './features/admin/AdminModal'
import SupportPage from './features/support/SupportPage'
import PrivacyPage from './features/legal/PrivacyPage'
import TermsPage from './features/legal/TermsPage'
import AuthCallbackPage from './features/auth/AuthCallbackPage'
import AccountPage from './features/account/AccountPage'
import SeoHead from './components/seo/SeoHead'
import { getRouteMetadata } from './lib/metadata'

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
  commercial: '/commercial',
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
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''
const NOTIFY_TIMEOUT_MS = 4000

function formatTrackLocationLabel(city, state) {
  const cityPart = String(city || '').trim()
  const statePart = String(state || '').trim()
  if (cityPart && statePart) return `${cityPart}, ${statePart}`
  if (cityPart) return cityPart
  if (statePart) return statePart
  return ''
}

export default function App() {
  const shouldReduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const routerLocation = useLocation()

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
        setAuthError(
          'Google sign-in is not available right now. Check the provider setup and try again shortly.',
        )
        return false
      }

      if (!data?.url) {
        setAuthError(
          'Google sign-in is not available right now. Check the provider setup and try again shortly.',
        )
        return false
      }

      window.location.assign(data.url)
      return true
    } catch (error) {
      console.error('Sign in failed:', error)
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
      if (session?.user) setAuthError('')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      setAuthSession(session ?? null)
      setUser(session?.user ?? null)
      if (session?.user) setAuthError('')
      if (event === 'SIGNED_IN' && session) {
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

        const since = new Date(Date.now() - 30 * 86400000).toISOString()
        const { data: reports30d } = await supabase
          .from('reports')
          .select('pin, city, created_at')
          .gte('created_at', since)

        if (!cancelled) {
          if (!reports30d?.length) {
            setShortageSummary(null)
            return
          }

          const pinCounts = {}
          const pinCities = {}
          reports30d.forEach((r) => {
            pinCounts[r.pin] = (pinCounts[r.pin] || 0) + 1
            if (r.city) pinCities[r.pin] = r.city
          })

          const active = Object.entries(pinCounts).filter(([, n]) => n >= 2)
          if (!active.length) {
            setShortageSummary(null)
            return
          }

          const hot = active.sort((a, b) => b[1] - a[1])[0]
          setShortageSummary({
            activePinCount: active.length,
            totalReports: reports30d.length,
            hotspot: pinCities[hot[0]] || `PIN ${hot[0]}`,
            hotspotReports: hot[1],
          })
        }
      } catch {
        if (!cancelled) setShortageSummary(null)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  // Handlers (track + admin unlock). Keep backend interactions intact.
  const handleTrack = useCallback(async () => {
    if (!pin || pin.length !== 6) {
      setError('Enter a valid 6-digit PIN code.')
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
      supabase.from('pin_track_summary_v1').select('*').eq('pin', pin).maybeSingle(),
      supabase.from('pin_data').select('*').eq('pin', pin).single(),
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
          avg_days: avgDays ?? '—',
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
          avg_days: avgDays ?? '—',
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
  }, [logoClicks])

  const handleAdminUnlock = useCallback(async (password) => {
    if (password !== ADMIN_PASSWORD) return false
    setShowAdminPrompt(false)
    setAdminUnlocked(true)
    navigate(TAB_ROUTES.admin)
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
      if (data.ok) setAdminData(data)
    } catch {
      // silent
    }
    setAdminLoading(false)
    return true
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
    if (p === '/' || p.startsWith('/track')) return 'track'
    if (p.startsWith('/reports')) return 'reports'
    if (p.startsWith('/news')) return 'news'
    if (p.startsWith('/alerts')) return 'alerts'
    if (p.startsWith('/commercial')) return 'commercial'
    if (p.startsWith('/admin')) return 'admin'
    return null
  })()

  const seoMetadata = getRouteMetadata(routerLocation.pathname || '/')

  const handleTabChange = useCallback((nextTab) => {
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
  }

  return (
    <>
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
            <Routes location={routerLocation}>
              <Route path="/" element={<Navigate to={TAB_ROUTES.track} replace />} />
              <Route path={TAB_ROUTES.track} element={<TrackTab {...trackProps} />} />
              <Route
                path={TAB_ROUTES.reports}
                element={
                  <ReportsTab
                    user={user}
                    authLoading={authLoading}
                    onGoogleSignIn={handleGoogleSignIn}
                  />
                }
              />
              <Route path={TAB_ROUTES.news} element={<NewsTab />} />
              <Route path={TAB_ROUTES.alerts} element={<AlertsTab />} />
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
              <Route
                path={CONTENT_ROUTES.bangalorePrice}
                element={<BangaloreGuidePage {...BANGALORE_GUIDES[CONTENT_ROUTES.bangalorePrice]} mapPrices={mapPrices} />}
              />
              <Route
                path={CONTENT_ROUTES.bangaloreDelivery}
                element={<BangaloreGuidePage {...BANGALORE_GUIDES[CONTENT_ROUTES.bangaloreDelivery]} mapPrices={mapPrices} />}
              />
              <Route
                path={CONTENT_ROUTES.bangaloreCommercial}
                element={<BangaloreGuidePage {...BANGALORE_GUIDES[CONTENT_ROUTES.bangaloreCommercial]} mapPrices={mapPrices} />}
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
                path={TAB_ROUTES.admin}
                element={
                  adminUnlocked ? (
                    <AdminTab
                      data={adminData}
                      loading={adminLoading}
                      onLock={() => {
                        setAdminUnlocked(false)
                        navigate(TAB_ROUTES.track, { replace: true })
                      }}
                    />
                  ) : (
                    <Navigate to={TAB_ROUTES.track} replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to={TAB_ROUTES.track} replace />} />
            </Routes>
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
