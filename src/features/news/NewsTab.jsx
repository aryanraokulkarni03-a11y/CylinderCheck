// src/features/news/NewsTab.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import NewsMap, { getCity } from './NewsMap'
import { FadeIn } from '../../components/motion/FadeIn'
import { Loader2, MapPin, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { PillRow } from '../../components/ui/PillRow'
import { Card } from '../../components/ui/Card'
import { Callout } from '../../components/ui/Callout'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import EmptyState from '../../components/shared/EmptyState'

const DOT = '\u00B7'
const DOWN = '\u2193'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`

let cachedNews = []
let lastFetchedAt = 0
let cachedNewsUpdatedAt = null

const RE_SHORTAGE = /shortage|delay|disruption|supply|scarcity|crisis|queue|queues|shut(?:ter|ting)?|sealed|switch to power|electric cooktop|electric cooktops|alternative/i
const RE_PRICE = /price|rate|hike|revision|subsidy|cost|expensive/i
const RE_POLICY = /ministry|government|policy|rule|regulation|announce|minister|customer data|oil cos seek/i

const STATE_LOCATION_LABELS = [
  ['andaman and nicobar islands', 'Andaman and Nicobar Islands'],
  ['andaman & nicobar islands', 'Andaman and Nicobar Islands'],
  ['andhra pradesh', 'Andhra Pradesh'],
  ['arunachal pradesh', 'Arunachal Pradesh'],
  ['assam', 'Assam'],
  ['bihar', 'Bihar'],
  ['chandigarh', 'Chandigarh'],
  ['chhattisgarh', 'Chhattisgarh'],
  ['dadra and nagar haveli and daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['dadra & nagar haveli and daman & diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['dadra and nagar haveli', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['delhi', 'Delhi'],
  ['nct of delhi', 'Delhi'],
  ['goa', 'Goa'],
  ['gujarat', 'Gujarat'],
  ['haryana', 'Haryana'],
  ['himachal pradesh', 'Himachal Pradesh'],
  ['jammu and kashmir', 'Jammu and Kashmir'],
  ['jammu & kashmir', 'Jammu and Kashmir'],
  [' j&k ', 'Jammu and Kashmir'],
  ['jharkhand', 'Jharkhand'],
  ['karnataka', 'Karnataka'],
  ['kerala', 'Kerala'],
  ['ladakh', 'Ladakh'],
  ['lakshadweep', 'Lakshadweep'],
  ['madhya pradesh', 'Madhya Pradesh'],
  ['maharashtra', 'Maharashtra'],
  ['manipur', 'Manipur'],
  ['meghalaya', 'Meghalaya'],
  ['mizoram', 'Mizoram'],
  ['nagaland', 'Nagaland'],
  ['odisha', 'Odisha'],
  ['orissa', 'Odisha'],
  ['puducherry', 'Puducherry'],
  ['pondicherry', 'Puducherry'],
  ['punjab', 'Punjab'],
  ['rajasthan', 'Rajasthan'],
  ['sikkim', 'Sikkim'],
  ['tamil nadu', 'Tamil Nadu'],
  ['telangana', 'Telangana'],
  ['tripura', 'Tripura'],
  ['uttar pradesh', 'Uttar Pradesh'],
  ['uttarakhand', 'Uttarakhand'],
  ['uttaranchal', 'Uttarakhand'],
  ['west bengal', 'West Bengal'],
]

function getCategory(title) {
  if (RE_SHORTAGE.test(title)) return 'SHORTAGE SIGNALS'
  if (RE_PRICE.test(title)) return 'PRICE & RATES'
  if (RE_POLICY.test(title)) return 'POLICY'
  return 'GENERAL'
}

const CAT_STATUS = {
  'SHORTAGE SIGNALS': 'severe',
  'PRICE & RATES': 'active',
  POLICY: 'early',
  GENERAL: 'clear',
}

function statusPill(status) {
  if (status === 'severe') {
    return 'text-[var(--status-severe)] bg-[var(--status-severe-soft)] border border-[var(--status-severe-border)]'
  }
  if (status === 'active') {
    return 'text-[var(--status-active)] bg-[var(--status-active-soft)] border border-[var(--status-active-border)]'
  }
  if (status === 'early') {
    return 'text-[var(--status-early)] bg-[var(--status-early-soft)] border border-[var(--status-early-border)]'
  }
  return 'text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]'
}

function timeAgo(pubDate) {
  try {
    const t = pubDate instanceof Date ? pubDate.getTime() : Number.NaN
    if (!Number.isFinite(t)) return ''

    const ms = Date.now() - t
    if (!Number.isFinite(ms)) return ''
    const mins = Math.max(0, Math.round(ms / 60000))
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.round(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

function formatLastUpdated(value) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    const time = date.getTime()
    if (!Number.isFinite(time)) return ''

    const diff = Date.now() - time
    const mins = Math.max(0, Math.round(diff / 60000))
    if (mins < 60) return `Updated ${mins}m ago`

    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `Updated ${hrs}h ago`

    return `Updated ${date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return ''
  }
}

function buildWhatsAppLink(item) {
  const title = item?.title ? String(item.title).trim() : 'CylinderCheck update'
  const source = item?.source ? String(item.source).trim() : ''
  const category = item?.category || getCategory(title)
  const city = item?.city ? String(item.city).trim() : ''
  const link = item?.link ? String(item.link).trim() : ''
  const signal = city || (category !== 'GENERAL' ? category : '')
  const text = [
    'CylinderCheck LPG intel',
    title,
    signal ? `Signal: ${signal}` : '',
    source ? `Source: ${source}` : '',
    link,
  ].filter(Boolean).join('\n')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

function categoryStreamLabel(category) {
  if (category === 'SHORTAGE SIGNALS') return 'Shortage reports'
  if (category === 'PRICE & RATES') return 'Price changes'
  if (category === 'POLICY') return 'Policy updates'
  return 'More news'
}

function getDisplayLocation(item) {
  if (item?.displayLocation) return String(item.displayLocation).trim()
  if (item?.city) return String(item.city).trim()

  const exactCity = getCity(item?.title || '', item?.link || '')
  if (exactCity) return exactCity

  const haystack = `${item?.title || ''} ${item?.link || ''}`.toLowerCase()
  for (const [needle, label] of STATE_LOCATION_LABELS) {
    if (haystack.includes(needle)) return label
  }

  return ''
}

export default function NewsTab() {
  const [news, setNews] = useState(cachedNews)
  const [loading, setLoading] = useState(!cachedNews.length)
  const [error, setError] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [showGeneral, setShowGeneral] = useState(false)
  const [newsUpdatedAt, setNewsUpdatedAt] = useState(cachedNewsUpdatedAt)

  const fetchNews = useCallback((force = false) => {
    const STALE_MS = 5 * 60 * 1000
    if (!force && Date.now() - lastFetchedAt < STALE_MS) {
      setNews(cachedNews)
      setNewsUpdatedAt(cachedNewsUpdatedAt)
      setLoading(false)
      return
    }

    if (!SUPABASE_ANON_KEY || !SUPABASE_FUNC_URL.includes('http')) {
      setError('Missing Supabase config. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }

    setError(null)
    setLoading(true)
    fetch(`${SUPABASE_FUNC_URL}/lpg-news`, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.articles?.length) {
          const parsed = d.articles.map((a) => ({
            title: a.title,
            source: a.source,
            link: a.link,
            googleLink: a.googleLink,
            sourceUrl: a.sourceUrl,
            pubDate: new Date(a.pubDate),
            category: a.category || getCategory(a.title),
            city: a.city || getCity(a.title, a.link),
            displayLocation: a.displayLocation || '',
          }))
          cachedNews = parsed
          cachedNewsUpdatedAt = d.updatedAt || null
          lastFetchedAt = Date.now()
          setNews(parsed)
          setNewsUpdatedAt(d.updatedAt || null)
        } else {
          setError('No recent items returned right now.')
        }
      })
      .catch(() => {
        setError('Feed temporarily unavailable. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const validNews = useMemo(() => {
    if (!Array.isArray(news)) return []

    return [...news].sort((a, b) => {
      const aTime = a?.pubDate instanceof Date ? a.pubDate.getTime() : 0
      const bTime = b?.pubDate instanceof Date ? b.pubDate.getTime() : 0
      return bTime - aTime
    })
  }, [news])

  const cityHasNews = useMemo(() => {
    const out = {}
    for (const n of validNews) {
      if (n?.city) out[n.city] = true
    }
    return out
  }, [validNews])

  const cities = useMemo(() => {
    return Object.keys(cityHasNews).sort((a, b) => a.localeCompare(b))
  }, [cityHasNews])

  const filteredNews = selectedCity ? validNews.filter((n) => n.city === selectedCity) : validNews

  const grouped = useMemo(() => {
    return filteredNews.reduce((acc, item) => {
      const cat = item.category || getCategory(item.title)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [filteredNews])

  const leadStory = filteredNews[0] || null
  const leadLocation = useMemo(
    () => (leadStory ? getDisplayLocation(leadStory) : ''),
    [leadStory],
  )
  const mapStory = useMemo(
    () => filteredNews.find((item) => item?.city) || null,
    [filteredNews],
  )
  const leadCity = selectedCity || mapStory?.city || null
  const leadSignalKey = mapStory
    ? `${mapStory.title}:${mapStory.pubDate instanceof Date ? mapStory.pubDate.toISOString() : ''}:${mapStory.city || ''}`
    : ''
  const mapLabel = leadCity || 'No city tag'
  const mapHeading = mapStory ? 'Latest mapped story' : 'News map'
  const mapNote = !mapStory
    ? 'Recent stories are statewide or do not mention a city yet. The map will update when the next city-tagged story arrives.'
    : leadStory && mapStory.link !== leadStory.link
      ? `The top story is broader than one city. The map is following the newest city-tagged story from ${mapStory.city}.`
      : leadCity
        ? `Map is following the latest city-tagged story from ${leadCity}.`
        : ''
  const order = ['SHORTAGE SIGNALS', 'PRICE & RATES', 'POLICY', 'GENERAL']

  const pageStatus =
    filteredNews.length <= 0
      ? 'clear'
      : grouped['SHORTAGE SIGNALS']?.length
        ? 'severe'
        : grouped['PRICE & RATES']?.length
          ? 'active'
          : grouped['POLICY']?.length
            ? 'early'
            : 'clear'

  return (
    <div className="page-root">
      <PageHeader
        title="News"
        description="Shortages, price changes, and policy moves that affect LPG across India. City-tagged when location is clear."
        actions={
          <button
            type="button"
            onClick={() => fetchNews(true)}
            disabled={loading}
            className="btn-ghost disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="motion-safe:animate-spin" /> : <RefreshCw size={18} />}
            Refresh feed
          </button>
        }
      />

      <div className="page-grid-rail">
        <div className="min-w-0">
          <PillRow
            ariaLabel="Filter by city"
            allowDeselect={true}
            value={selectedCity}
            onChange={(v) => setSelectedCity(v)}
            items={[
              { value: null, label: 'All India' },
              ...cities.map((c) => ({ value: c, label: c })),
            ]}
          />

          {newsUpdatedAt ? (
            <div className="mt-3">
              <span className="type-note text-[var(--text-muted)]">
                {formatLastUpdated(newsUpdatedAt)}
              </span>
            </div>
          ) : null}

          {error && (
            <Callout tone="active" className="mt-3">
              <div className="type-card-copy text-[var(--text-primary)]">{error}</div>
            </Callout>
          )}

          {loading && !validNews.length ? (
            <div className="mt-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  variant="inset"
                  className="opacity-60 motion-safe:animate-pulse"
                  aria-hidden="true"
                >
                  <div className="kicker mb-3">Loading story</div>
                  <div className="h-4 w-32 rounded bg-[var(--bg-inset)] mb-3" />
                  <div className="h-3 w-4/5 rounded bg-[var(--bg-inset)] mb-2" />
                  <div className="h-3 w-2/3 rounded bg-[var(--bg-inset)]" />
                </Card>
              ))}
            </div>
          ) : !validNews.length ? (
            <div className="mt-4">
              <EmptyState
                title="No recent news"
                description="No recent LPG stories are showing right now. Refresh and check again."
                actionText="Refresh feed"
                onAction={() => fetchNews(true)}
              />
            </div>
          ) : (
            <FadeIn delay={0.08}>
              <div className="mt-6 space-y-10">
                {leadStory && (
                  <Card as="article" className="news-lead-card relative overflow-hidden card--interactive">
                    <CardBody>
                      <div className="news-lead-card__topline">
                        <div className="news-lead-card__meta">
                          <span className="news-lead-card__source">
                            {leadStory.source}
                          </span>
                          {leadLocation ? (
                            <>
                              <span className="news-lead-card__sep" aria-hidden="true">
                                {DOT}
                              </span>
                              <span className="news-lead-card__city">
                                <MapPin size={12} className="text-[var(--accent)]" /> {leadLocation}
                              </span>
                            </>
                          ) : null}
                        </div>

                        <div className="news-lead-card__actions">
                          <span className="news-lead-card__time">
                            {timeAgo(leadStory.pubDate)}
                          </span>
                          <span className="news-lead-card__sep" aria-hidden="true">
                            {DOT}
                          </span>
                          <a
                            href={buildWhatsAppLink(leadStory)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-lead-card__share"
                            aria-label="Share to WhatsApp"
                            title="Share"
                          >
                            Share
                          </a>
                        </div>
                      </div>

                      <h2 className="news-lead-card__headline">
                        <a
                          href={leadStory.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="news-lead-card__headline-link"
                        >
                          {leadStory.title}
                        </a>
                      </h2>

                    </CardBody>
                  </Card>
                )}

                {order.map((cat) => {
                  const items = grouped[cat]
                  if (!items || !items.length) return null

                  if (cat === 'GENERAL' && !showGeneral) {
                    return (
                      <button
                        key={cat}
                        type="button"
                        className="w-full card card--inset card--dashed card--compact row--interactive text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        onClick={() => setShowGeneral(true)}
                      >
                        <span className="kicker">
                          Show {items.length} general items {DOWN}
                        </span>
                      </button>
                    )
                  }

                  return (
                    <div key={cat}>
                      <div className="news-stream-heading">
                        <div className="news-stream-heading__main">
                          <span
                            className={`news-stream-heading__dot news-stream-heading__dot--${CAT_STATUS[cat] || 'clear'}`}
                            aria-hidden="true"
                          />
                          <span className="news-stream-heading__label">
                            {categoryStreamLabel(cat)}
                          </span>
                        </div>
                      </div>

                      <div className="news-stream-list mt-4">
                        {items.map((item, i) => {
                          if (leadStory && item.link === leadStory.link) return null

                          const catHere = item.category || getCategory(item.title)
                          const status = CAT_STATUS[catHere] || 'clear'
                          const locationLabel = getDisplayLocation(item)

                          return (
                            <article
                              key={`${item.link}:${i}`}
                              className={`news-signal-row news-signal-row--${status} row--interactive`}
                            >
                              <div className="news-signal-row__topline">
                                <div className="news-signal-row__meta">
                                  <span className="news-signal-row__source">
                                    {item.source}
                                  </span>
                                  {locationLabel ? (
                                    <>
                                      <span className="news-signal-row__sep" aria-hidden="true">
                                        {DOT}
                                      </span>
                                      <span className="news-signal-row__city">
                                        <MapPin size={12} className="text-[var(--accent)]" /> {locationLabel}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                                <span className="news-signal-row__time">
                                  {timeAgo(item.pubDate)}
                                </span>
                              </div>

                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-signal-row__headline-link"
                              >
                                <h3 className="type-list-title m-0 news-signal-row__headline">
                                  {item.title}
                                </h3>
                              </a>

                              <div className="news-signal-row__shareline">
                                <a
                                  href={buildWhatsAppLink(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="news-signal-row__share"
                                  aria-label="Share to WhatsApp"
                                  title="Share"
                                >
                                  Share
                                </a>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </FadeIn>
          )}
        </div>

        <div className="page-sticky-lg min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="kicker">
              {mapHeading}
            </div>
            <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
              {mapLabel}
            </span>
          </div>

          {mapNote ? (
            <div className="mb-3">
              <Callout tone={mapStory ? 'accent' : 'early'} edge={false}>
                <div className="type-note text-[var(--text-secondary)]">
                  {mapNote}
                </div>
              </Callout>
            </div>
          ) : null}

          <FadeIn delay={0.12}>
            <Card
              variant="raised"
              className="card--flush overflow-hidden h-[420px] lg:h-[calc(100vh-var(--topbar-height)-120px)]"
            >
              <div className="relative h-full p-1 sm:p-2">
                <NewsMap
                  leadCity={leadCity}
                  leadSignalKey={leadSignalKey}
                  onSelectCity={(c) => setSelectedCity((prev) => (prev === c ? null : c))}
                />

                {!mapStory ? (
                  <div className="absolute inset-4 z-[350] flex items-center justify-center pointer-events-none">
                    <div className="max-w-[18rem] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-raised)_88%,transparent)] px-4 py-3 text-center shadow-[var(--shadow-soft)] backdrop-blur-sm">
                      <div className="kicker text-[var(--text-secondary)] mb-2">
                        Waiting for a mapped city
                      </div>
                      <p className="type-note m-0 text-[var(--text-muted)]">
                        Recent stories are broader than one city right now. The map will update when a city-tagged story arrives.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="absolute bottom-4 right-4 z-[400] rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 pointer-events-none">
                  <div className="flex items-center gap-2 kicker">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    Mapped stories
                  </div>
                </div>
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
