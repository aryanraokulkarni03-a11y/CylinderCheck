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
  addDays,
  computeUrgency,
  daysUntil,
  lookupPIN,
} from './lib/utils'

import AppShell from './components/layout/AppShell'
import { Topbar } from './components/layout/Topbar'
import { BottomNav } from './components/layout/BottomNav'
import { SupportModal } from './components/modals/SupportModal'
import { Footer } from './components/layout/Footer'

import TrackTab from './features/track/TrackTab'
import ReportsTab from './features/reports/ReportsTab'
import NewsTab from './features/news/NewsTab'
import AlertsTab from './features/alerts/AlertsTab'
import CommercialPage from './features/commercial/CommercialPage'
import AdminTab from './features/admin/AdminTab'
import AdminModal from './features/admin/AdminModal'

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
}

const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''

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
  const resultRef = useRef(null)

  // Prices + national summary (used on Track tab)
  const [mapPrices, setMapPrices] = useState({})
  const [shortageSummary, setShortageSummary] = useState(null)

  // Auth
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Admin (logo Easter egg)
  const [logoClicks, setLogoClicks] = useState(0)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminData, setAdminData] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // UI
  const [showSupport, setShowSupport] = useState(false)

  const restorePostAuthPath = useCallback(() => {
    try {
      const explicitPath = sessionStorage.getItem('cc-post-auth-path')
      const legacyTab = sessionStorage.getItem('cc-post-auth-tab')

      sessionStorage.removeItem('cc-post-auth-path')
      sessionStorage.removeItem('cc-post-auth-tab')

      const target =
        explicitPath && explicitPath.startsWith('/')
          ? explicitPath
          : (legacyTab && TAB_ROUTES[legacyTab]) ? TAB_ROUTES[legacyTab] : null

      if (target) navigate(target, { replace: true })
    } catch {
      // Private mode.
    }
  }, [navigate])

  // Auth effect
  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session?.user) restorePostAuthPath()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      setUser(session?.user ?? null)

      // After OAuth returns, restore the route the user was on.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        restorePostAuthPath()
      }
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [restorePostAuthPath])

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
              // We only want the latest entry per city/company (query is sorted desc).
              if (!grouped[row.city][row.company]) {
                grouped[row.city][row.company] = { price: row.price }
              }
            }
            setMapPrices(grouped)
          } else {
            setMapPrices({})
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
      { data: dbData },
      location,
      { data: recentReports },
      { data: rpcAvgData },
    ] = await Promise.all([
      supabase.from('pin_data').select('*').eq('pin', pin).single(),
      lookupPIN(pin),
      supabase.from('reports').select('id, created_at').eq('pin', pin)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.rpc('get_avg_delivery_days', { p_pin: pin }),
    ])

    const reportCount = recentReports?.length || 0
    const last7 = (recentReports || []).filter(
      (r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)
    ).length
    const prior7 = reportCount - last7
    const trend = last7 > prior7 + 1
      ? 'worsening'
      : last7 < prior7
        ? 'improving'
        : 'stable'

    const avgDays = typeof dbData?.avg_days === 'number'
      ? dbData.avg_days
      : (typeof rpcAvgData === 'number' ? rpcAvgData : null)

    const builtPinData = dbData
      ? {
          ...dbData,
          avg_days: avgDays ?? '—',
          city: location ? `${location.city}, ${location.state}` : dbData.city,
          area: location?.area || '',
          trend,
          reportCount,
        }
      : {
          pin,
          city: location ? `${location.city}, ${location.state}` : `PIN ${pin}`,
          area: location?.area || '',
          agency: 'Check with local agency',
          avg_days: avgDays ?? '—',
          trend,
          reportCount,
        }

    // Compute urgency score when cylinder level is known
    const dLeft = lastBooking ? daysUntil(addDays(new Date(lastBooking), 25)) : null
    if (cylinderLevel) {
      builtPinData.urgencyScore = computeUrgency({
        cylinderLevel,
        daysLeft: dLeft,
        reportCount,
        avgDays: typeof avgDays === 'number' ? avgDays : 5,
      })
    }

    setPinData(builtPinData)

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
    return 'track'
  })()

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
    handleTrack,
    resultRef,
    shortageSummary,
    mapPrices,
    onCommercialClick: () => navigate(TAB_ROUTES.commercial),
  }

  return (
    <>
      <AppShell
        topbar={
          <Topbar
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            user={user}
            authLoading={authLoading}
            logoClicks={logoClicks}
            onLogoClick={handleLogoClick}
            onSupportOpen={() => setShowSupport(true)}
          />
        }
        bottomNav={<BottomNav tabs={visibleTabs} activeTab={activeTab} onTabChange={handleTabChange} />}
        footer={<Footer onSupportOpen={() => setShowSupport(true)} />}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={routerLocation.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
          >
            <Routes location={routerLocation}>
              <Route path="/" element={<Navigate to={TAB_ROUTES.track} replace />} />
              <Route path={TAB_ROUTES.track} element={<TrackTab {...trackProps} />} />
              <Route path={TAB_ROUTES.reports} element={<ReportsTab user={user} authLoading={authLoading} />} />
              <Route path={TAB_ROUTES.news} element={<NewsTab />} />
              <Route path={TAB_ROUTES.alerts} element={<AlertsTab />} />
              <Route path={TAB_ROUTES.commercial} element={<CommercialPage prefilledCity={normalizedCity} />} />
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

      {/* Support modal */}
      <AnimatePresence>
        {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      </AnimatePresence>

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
