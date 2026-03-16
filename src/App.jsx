// src/App.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from './supabaseClient'
import { getTheme } from './theme.js'
import { springs } from './lib/springs'
import { lookupPIN, loadRazorpay, CITY_COORDS, CITY_NORMALISE, COMPANIES, addDays, daysUntil, computeUrgency } from './lib/utils'

// Layout
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { BottomNav } from './components/layout/BottomNav'

// Modals
import { SupportModal } from './components/modals/SupportModal'

// Feature tabs
import TrackTab from './features/track/TrackTab'
import PricesTab from './features/prices/PricesTab'
import ReportsTab from './features/reports/ReportsTab'
import NewsTab from './features/news/NewsTab'
import AlertsTab from './features/alerts/AlertsTab'
import CommercialPage from './features/commercial/CommercialPage'
import AdminTab from './features/admin/AdminTab'
import AdminModal from './features/admin/AdminModal'

// Tab icons
import {
  Target, DollarSign, MessageSquare,
  Newspaper, Bell, Store, HelpCircle
} from 'lucide-react'


const TABS = [
  { id: 'track',      label: 'Track',    icon: Target },
  { id: 'prices',     label: 'Prices',   icon: DollarSign },
  { id: 'community',  label: 'Reports',  icon: MessageSquare },
  { id: 'news',       label: 'News',     icon: Newspaper },
  { id: 'alerts',     label: 'Alerts',   icon: Bell },
  { id: 'commercial', label: 'For Biz',  icon: Store },
]

const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const RAZORPAY_KEY_ID   = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
const ADMIN_PASSWORD    = import.meta.env.VITE_ADMIN_PASSWORD || ''

export default function App() {
  // ── Tab state ────────────────────────────────────────────
  const [tab, setTab] = useState('track')

  // ── Track tab ────────────────────────────────────────────
  const [pin, setPin] = useState('')
  const [lastBooking, setLastBooking] = useState('')
  const [pinData, setPinData] = useState(null)
  const [bookingResult, setBookingResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cylinderLevel, setCylinderLevel] = useState(null)
  const resultRef = useRef(null)

  // ── Reports ──────────────────────────────────────────────
  const [reports, setReports] = useState([])
  const [reportText, setReportText] = useState('')
  const [reportPin, setReportPin] = useState('')
  const [reportCity, setReportCity] = useState('')
  const [reportDeliveryDays, setReportDeliveryDays] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [votes, setVotes] = useState({})
  const [editingReportId, setEditingReportId] = useState(null)
  const [editingText, setEditingText] = useState('')

  // ── Alerts ───────────────────────────────────────────────
  const [contact, setContact] = useState('')
  const [alertPin, setAlertPin] = useState('')
  const [alertDate, setAlertDate] = useState('')
  const [alertSaved, setAlertSaved] = useState(false)
  const [freeAlertSaving, setFreeAlertSaving] = useState(false)
  const [freeAlertError, setFreeAlertError] = useState('')

  // ── Payment ──────────────────────────────────────────────
  const [payContact, setPayContact] = useState('')
  const [payPin, setPayPin] = useState('')
  const [paying, setPaying] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [payError, setPayError] = useState('')

  // ── Admin ────────────────────────────────────────────────
  const [logoClicks, setLogoClicks] = useState(0)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminData, setAdminData] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // ── News ─────────────────────────────────────────────────
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [shortageSummary, setShortageSummary] = useState(null)
  const newsLastFetched = useRef(null)

  // ── Prices ───────────────────────────────────────────────
  const [mapPrices, setMapPrices] = useState({})
  const [pricesLastUpdated, setPricesLastUpdated] = useState(null)

  // ── Auth ─────────────────────────────────────────────────
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── UI ───────────────────────────────────────────────────
  const [showSupport, setShowSupport] = useState(false)

  // ── Auth effect ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Prices & shortage summary effect ────────────────────
  useEffect(() => {
    supabase.from('lpg_prices').select('*').order('recorded_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const grouped = {}
        for (const row of data) {
          if (!grouped[row.city]) grouped[row.city] = {}
          if (!grouped[row.city][row.company]) {
            grouped[row.city][row.company] = { price: row.price }
            if (!pricesLastUpdated || new Date(row.recorded_at) > new Date(pricesLastUpdated)) {
              setPricesLastUpdated(row.recorded_at)
            }
          }
        }
        setMapPrices(grouped)
      })

    supabase.from('reports').select('pin, city, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .then(({ data }) => {
        if (!data?.length) return
        const pinCounts = {}, pinCities = {}
        data.forEach(r => {
          pinCounts[r.pin] = (pinCounts[r.pin] || 0) + 1
          if (r.city) pinCities[r.pin] = r.city
        })
        const active = Object.entries(pinCounts).filter(([, n]) => n >= 2)
        if (active.length) {
          const hot = active.sort((a, b) => b[1] - a[1])[0]
          setShortageSummary({
            activePinCount: active.length,
            totalReports: data.length,
            hotspot: pinCities[hot[0]] || `PIN ${hot[0]}`,
            hotspotReports: hot[1],
          })
        }
      })
  }, [])

  // ── Handlers ─────────────────────────────────────────────
  const handleTrack = useCallback(async () => {
    if (!pin || pin.length !== 6) { setError('Enter a valid 6-digit PIN code.'); return }
    setError(''); setLoading(true); setPinData(null); setBookingResult(null)

    const [{ data: dbData }, location, { data: recentReports }, { data: rpcAvgData }] = await Promise.all([
      supabase.from('pin_data').select('*').eq('pin', pin).single(),
      lookupPIN(pin),
      supabase.from('reports').select('id, created_at').eq('pin', pin)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.rpc('get_avg_delivery_days', { p_pin: pin }),
    ])

    const reportCount = recentReports?.length || 0
    const last7 = (recentReports || []).filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length
    const prior7 = reportCount - last7
    const trend = last7 > prior7 + 1 ? 'worsening' : last7 < prior7 ? 'improving' : 'stable'

    const avgDays = typeof dbData?.avg_days === 'number'
      ? dbData.avg_days
      : (typeof rpcAvgData === 'number' ? rpcAvgData : null)

    const builtPinData = dbData
      ? { ...dbData, avg_days: avgDays ?? '—', city: location ? `${location.city}, ${location.state}` : dbData.city, area: location?.area || '', trend, reportCount }
      : { pin, city: location ? `${location.city}, ${location.state}` : `PIN ${pin}`, area: location?.area || '', agency: 'Check with local agency', avg_days: avgDays ?? '—', trend, reportCount }

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
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [pin, lastBooking])

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
    setTab('admin')
    setAdminLoading(true)
    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/get-admin-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ admin_password: password }),
      })
      const data = await res.json()
      if (data.ok) setAdminData(data)
    } catch { /* silent */ }
    setAdminLoading(false)
    return true
  }, [])

  const fetchNews = useCallback(async (force = false) => {
    if (!force && newsLastFetched.current && Date.now() - newsLastFetched.current < 5 * 60 * 1000) return
    setNewsLoading(true)
    try {
      const res = await fetch(`${SUPABASE_FUNC_URL}/lpg-news`, {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      })
      const data = await res.json()
      if (data.articles) { setNews(data.articles); newsLastFetched.current = Date.now() }
    } catch { /* silent */ }
    setNewsLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'news') fetchNews()
  }, [tab, fetchNews])

  // ── Render ───────────────────────────────────────────────
  const trackProps = {
    pin, setPin, lastBooking, setLastBooking,
    pinData, bookingResult, loading, error,
    cylinderLevel, setCylinderLevel,
    handleTrack, resultRef,
    shortageSummary, mapPrices,
    onCommercialClick: () => setTab('commercial'),
  }

  const reportsProps = {
    reports, setReports, reportText, setReportText,
    reportPin, setReportPin, reportCity, setReportCity,
    reportDeliveryDays, setReportDeliveryDays,
    submitting, setSubmitting, submitOk, setSubmitOk,
    votes, setVotes,
    editingReportId, setEditingReportId,
    editingText, setEditingText,
    user,
    authLoading,
  }

  const alertsProps = {
    contact, setContact, alertPin, setAlertPin,
    alertDate, setAlertDate, alertSaved, setAlertSaved,
    freeAlertSaving, setFreeAlertSaving,
    freeAlertError, setFreeAlertError,
    payContact, setPayContact, payPin, setPayPin,
    paying, setPaying, paySuccess, setPaySuccess,
    payError, setPayError,
  }

  const activeTabContent = {
    track:      <TrackTab {...trackProps} />,
    prices:     <PricesTab mapPrices={mapPrices} lastUpdated={pricesLastUpdated}
                           contact={contact} setContact={setContact}
                           alertSaved={alertSaved} setAlertSaved={setAlertSaved} />,
    community:  <ReportsTab {...reportsProps} />,
    news:       <NewsTab />,
    alerts:     <AlertsTab />,
    commercial: <CommercialPage prefilledCity={
                  pinData?.city
                    ? CITY_NORMALISE[pinData.city.split(',')[0].trim().toLowerCase()] || ''
                    : ''
                } />,
    admin:      adminUnlocked ? <AdminTab data={adminData} loading={adminLoading}
                                          onLock={() => { setAdminUnlocked(false); setTab('track') }} />
                               : null,
  }

  const visibleTabs = adminUnlocked
    ? [...TABS, { id: 'admin', label: 'Admin', icon: Target }]
    : TABS

  return (
    <>
      <div className="flex min-h-screen min-h-dvh">
        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <Sidebar
            tabs={visibleTabs}
            activeTab={tab}
            onTabChange={setTab}
            user={user}
            authLoading={authLoading}
            logoClicks={logoClicks}
            onLogoClick={handleLogoClick}
            onSupportOpen={() => setShowSupport(true)}
          />
        </div>

        {/* Main */}
        <div className="md:ml-[var(--sidebar-width)] flex-1 flex flex-col">
          {/* Topbar — mobile only */}
          <Topbar user={user} authLoading={authLoading} />

          {/* Content */}
          <main id="main-content"
            className="flex-1 px-4 md:px-11 pt-6 max-w-[var(--content-max)]"
            style={{
              paddingBottom: 'calc(80px + env(safe-area-inset-bottom))'
            }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={springs.smooth}
              >
                {activeTabContent[tab]}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav tabs={visibleTabs} activeTab={tab} onTabChange={setTab} />

      {/* Support modal */}
      <AnimatePresence>
        {showSupport && (
          <SupportModal onClose={() => setShowSupport(false)} />
        )}
      </AnimatePresence>

      {/* Floating support FAB — mobile only */}
      <AdminModal
        isOpen={showAdminPrompt}
        onClose={() => setShowAdminPrompt(false)}
        onUnlock={handleAdminUnlock}
        loading={adminLoading}
      />

      <motion.button
        onClick={() => setShowSupport(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Support"
        className="md:hidden fixed z-[190] w-[42px] h-[42px] rounded-full
                   flex items-center justify-center
                   bg-[var(--bg-raised)] border border-[var(--border)]
                   text-[var(--text-secondary)] hover:text-[var(--accent)]
                   transition-colors duration-150"
        style={{
          bottom: 'calc(var(--bottomnav-height) + 14px + env(safe-area-inset-bottom))',
          right: '14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
        }}
      >
        <HelpCircle size={16} strokeWidth={1.8} />
      </motion.button>
    </>
  )
}
