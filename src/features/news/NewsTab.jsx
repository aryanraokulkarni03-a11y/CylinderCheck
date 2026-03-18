// src/features/news/NewsTab.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import NewsMap, { getCity } from './NewsMap'
import { FadeIn } from '../../components/motion/FadeIn'
import { ExternalLink, Loader2, MapPin, MessageCircle, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { PillRow } from '../../components/ui/PillRow'
import { Card } from '../../components/ui/Card'
import { Callout } from '../../components/ui/Callout'
import { List } from '../../components/ui/List'
import { ListRow } from '../../components/ui/ListRow'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { SectionMarker } from '../../components/shared/SectionMarker'
import EmptyState from '../../components/shared/EmptyState'

const DOT = '\u00B7'
const DOWN = '\u2193'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`

let cachedNews = []
let lastFetchedAt = 0

const RE_SHORTAGE = /shortage|delay|disruption|supply|scarcity|crisis/i
const RE_PRICE = /price|rate|hike|revision|subsidy|cost|expensive/i
const RE_POLICY = /ministry|government|policy|rule|regulation|announce/i

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

function buildWhatsAppLink(item) {
  const title = item?.title ? String(item.title).trim() : 'CylinderCheck update'
  const link = item?.link ? String(item.link).trim() : ''
  const text = ['CylinderCheck intel:', title, link].filter(Boolean).join('\n')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export default function NewsTab() {
  const [news, setNews] = useState(cachedNews)
  const [loading, setLoading] = useState(!cachedNews.length)
  const [error, setError] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [showGeneral, setShowGeneral] = useState(false)

  const fetchNews = useCallback((force = false) => {
    const STALE_MS = 5 * 60 * 1000
    if (!force && Date.now() - lastFetchedAt < STALE_MS) {
      setNews(cachedNews)
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
            pubDate: new Date(a.pubDate),
            city: getCity(a.title),
          }))
          cachedNews = parsed
          lastFetchedAt = Date.now()
          setNews(parsed)
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

  const validNews = Array.isArray(news) ? news : []

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
      const cat = getCategory(item.title)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [filteredNews])

  const leadStory = filteredNews[0] || null
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
    <div className="pb-12 w-full min-w-0">
      <PageHeader
        markerStatus={pageStatus}
        markerLabel="Intelligence Feed"
        title="LPG Intelligence"
        description="Live tracking of shortages, price hikes, and policy shifts across India. City-tagged when possible."
        actions={
          <button
            type="button"
            onClick={() => fetchNews(true)}
            disabled={loading}
            className="btn-ghost disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="motion-safe:animate-spin" /> : <RefreshCw size={18} />}
            Sync feed
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start min-w-0">
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
                  <div className="kicker mb-3">Loading feed item</div>
                  <div className="h-4 w-32 rounded bg-[var(--bg-inset)] mb-3" />
                  <div className="h-3 w-4/5 rounded bg-[var(--bg-inset)] mb-2" />
                  <div className="h-3 w-2/3 rounded bg-[var(--bg-inset)]" />
                </Card>
              ))}
            </div>
          ) : !validNews.length ? (
            <div className="mt-4">
              <EmptyState
                title="Scraper quiet"
                description="No recent intelligence found right now. Sync the feed and we will check again."
                actionText="Sync feed"
                onAction={() => fetchNews(true)}
              />
            </div>
          ) : (
            <FadeIn delay={0.08}>
              <div className="mt-6 space-y-10">
                {leadStory && (
                  <Card as="article" className="relative overflow-hidden card--interactive">
                    <div
                      className={`absolute top-0 left-0 h-full w-1 ${
                        CAT_STATUS[getCategory(leadStory.title)] === 'severe'
                          ? 'bg-[var(--status-severe)]'
                          : CAT_STATUS[getCategory(leadStory.title)] === 'active'
                            ? 'bg-[var(--status-active)]'
                            : CAT_STATUS[getCategory(leadStory.title)] === 'early'
                              ? 'bg-[var(--status-early)]'
                              : 'bg-[var(--divider)]'
                      }`}
                      aria-hidden="true"
                    />

                    <CardHeader
                      kicker="Lead story"
                      titleAs="h2"
                      title={leadStory.title}
                      meta={timeAgo(leadStory.pubDate)}
                      actions={
                        <div className="flex items-center gap-2">
                          <a
                            href={leadStory.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            aria-label="Open article"
                            title="Open"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <a
                            href={buildWhatsAppLink(leadStory)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn icon-btn--signal"
                            aria-label="Share to WhatsApp"
                            title="Share"
                          >
                            <MessageCircle size={16} />
                          </a>
                        </div>
                      }
                      className="pl-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        {(() => {
                          const cat = getCategory(leadStory.title)
                          const status = CAT_STATUS[cat] || 'clear'
                          return (
                            <span className={`badge ${statusPill(status)}`}>
                              {cat}
                            </span>
                          )
                        })()}
                        {leadStory.city ? (
                          <span className="badge text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)]">
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-[var(--accent)]" /> {leadStory.city}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </CardHeader>

                    <CardBody className="pl-3">
                      <div className="flex items-center gap-2 type-note">
                        <span className="kicker text-[var(--text-secondary)]">
                          {leadStory.source}
                        </span>
                        <span className="text-[var(--divider)]" aria-hidden="true">
                          {DOT}
                        </span>
                        <a
                          href={leadStory.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors"
                        >
                          Open article
                        </a>
                      </div>
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
                      <SectionMarker status={CAT_STATUS[cat] || 'clear'} label={cat} />

                      <List className="mt-4">
                        {items.map((item, i) => {
                          if (leadStory && item.link === leadStory.link) return null

                          const catHere = getCategory(item.title)
                          const status = CAT_STATUS[catHere] || 'clear'

                          return (
                            <ListRow
                              key={`${item.link}:${i}`}
                              as="article"
                              status={status}
                              interactive={true}
                              meta={timeAgo(item.pubDate)}
                              badges={<span className={`badge ${statusPill(status)}`}>{catHere}</span>}
                              title={
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                <h3 className="type-list-title m-0">
                                  {item.title}
                                </h3>
                              </a>
                              }
                              actions={
                                <a
                                  href={buildWhatsAppLink(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="icon-btn icon-btn--signal"
                                  aria-label="Share to WhatsApp"
                                  title="Share"
                                >
                                  <MessageCircle size={16} />
                                </a>
                              }
                            >
                              <div className="flex items-center gap-2 type-note">
                                <span className="kicker text-[var(--text-secondary)]">
                                  {item.source}
                                </span>
                                {item.city ? (
                                  <>
                                    <span className="text-[var(--divider)]" aria-hidden="true">
                                      {DOT}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin size={12} className="text-[var(--accent)]" /> {item.city}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </ListRow>
                          )
                        })}
                      </List>
                    </div>
                  )
                })}
              </div>
            </FadeIn>
          )}
        </div>

        <div className="lg:sticky lg:top-[calc(var(--topbar-height)+24px)] min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="kicker">
              Signals map
            </div>
            <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
              {selectedCity || 'All India'}
            </span>
          </div>

          <FadeIn delay={0.12}>
            <Card
              variant="raised"
              className="card--flush overflow-hidden h-[420px] lg:h-[calc(100vh-var(--topbar-height)-120px)]"
            >
              <div className="relative h-full p-1 sm:p-2">
                <NewsMap
                  cityHasNews={cityHasNews}
                  selectedCity={selectedCity}
                  onSelectCity={(c) => setSelectedCity((prev) => (prev === c ? null : c))}
                />

                <div className="absolute bottom-4 right-4 z-[400] rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 pointer-events-none">
                  <div className="flex items-center gap-2 kicker">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    Live signals
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
