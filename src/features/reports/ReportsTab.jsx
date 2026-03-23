// src/features/reports/ReportsTab.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import CompanyPicker, { COMPANY_PICKER_OPTS } from '../../components/shared/CompanyPicker'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import EmptyState from '../../components/shared/EmptyState'
import { AlertCircle, ArrowUp, Edit2, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { FadeIn } from '../../components/motion/FadeIn'
import { springs, staggerRules } from '../../lib/springs'
import { fadeUp, staggerContainer } from '../../lib/animations'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { List } from '../../components/ui/List'
import { ListRow } from '../../components/ui/ListRow'
import { Card } from '../../components/ui/Card'
import { CardHeader } from '../../components/ui/CardParts'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'

const ARROW = '\u2192'
const DOT = '\u00B7'

const CC_USER_VERSION = 'v1'
const CC_LS_KEY = `cc-user:${CC_USER_VERSION}`
const TRACK_REPORT_PREFILL_KEY = 'cc-track-report-prefill:v1'

function safeJsonParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function fmtDate(createdAt) {
  try {
    return new Date(createdAt).toLocaleDateString('en-IN')
  } catch {
    return ''
  }
}

function displayArea(r) {
  const pinLabel = `PIN ${r.pin}`
  const city = typeof r.city === 'string' ? r.city.trim() : ''
  if (!city) return null
  if (city.toUpperCase() === pinLabel.toUpperCase()) return null
  return city
}

export default function ReportsTab({ user, authLoading, onGoogleSignIn, onTrackBack }) {
  const shouldReduceMotion = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  const hydratedTrackPrefillRef = useRef(false)

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [reportText, setReportText] = useState('')
  const [reportPin, setReportPin] = useState('')
  const [reportCity, setReportCity] = useState('')
  const [reportDeliveryDays, setReportDeliveryDays] = useState('')

  const [reportCompany, setReportCompany] = useState(() => {
    const parsed = safeJsonParse(localStorage.getItem(CC_LS_KEY) || '')
    return parsed?.company || null
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [votes, setVotes] = useState({})
  const [voting, setVoting] = useState({})
  const [voteError, setVoteError] = useState(null)

  const [editingReportId, setEditingReportId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [trackPrefillContext, setTrackPrefillContext] = useState(null)

  const companyMeta = useMemo(() => {
    const m = new Map()
    for (const c of COMPANY_PICKER_OPTS) m.set(c.id, c)
    return m
  }, [])

  useEffect(() => {
    let alive = true

    async function fetchReports() {
      setLoading(true)
      setFetchError(null)
      setVoteError(null)

      const reportsPromise = supabase
        .from('reports')
        .select('*')
        .order('votes', { ascending: false })
        .limit(30)

      const votesPromise = user
        ? supabase
            .from('report_votes')
            .select('report_id')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null })

      const [{ data, error }, voteResult] = await Promise.all([reportsPromise, votesPromise])

      if (!alive) return

      if (error) {
        setFetchError('Could not load community reports right now.')
        setReports([])
        setVotes({})
        setLoading(false)
        return
      }

      setReports(Array.isArray(data) ? data : [])
      if (voteResult?.error) {
        setVotes({})
      } else {
        const nextVotes = Object.fromEntries(
          (voteResult?.data || []).map((row) => [row.report_id, true]),
        )
        setVotes(nextVotes)
      }
      setLoading(false)
    }

    fetchReports()
    return () => {
      alive = false
    }
  }, [user])

  useEffect(() => {
    try {
      const prev = safeJsonParse(localStorage.getItem(CC_LS_KEY) || '') || {}
      localStorage.setItem(CC_LS_KEY, JSON.stringify({ ...prev, company: reportCompany || null }))
    } catch {
      // Private mode / storage blocked.
    }
  }, [reportCompany])

  useEffect(() => {
    if (hydratedTrackPrefillRef.current) return

    const statePrefill = location.state?.reportPrefill
    let storedPrefill = null
    try {
      storedPrefill = safeJsonParse(sessionStorage.getItem(TRACK_REPORT_PREFILL_KEY) || '')
    } catch {
      storedPrefill = null
    }
    const prefill = statePrefill?.source === 'track'
      ? statePrefill
      : storedPrefill?.source === 'track'
        ? storedPrefill
        : null

    if (!prefill) return

    setReportPin(String(prefill.pin || '').slice(0, 6))
    setReportCity(String(prefill.city || ''))
    setTrackPrefillContext({
      pin: String(prefill.pin || '').slice(0, 6),
      contextLabel: String(prefill.contextLabel || '').trim(),
    })
    hydratedTrackPrefillRef.current = true

    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const handleReport = async () => {
    const pin = reportPin.trim()
    const issue = reportText.trim()
    const area = reportCity.trim()

    setSubmitOk(false)
    setSubmitError(null)

    if (!user) {
      setSubmitError('Sign in to submit a report.')
      return
    }
    if (pin.length !== 6) {
      setSubmitError('Enter a valid 6-digit PIN.')
      return
    }
    if (!issue) {
      setSubmitError('Add a short description of what is happening.')
      return
    }

    setSubmitting(true)
    try {
      const daysRaw = reportDeliveryDays.trim()
      const daysParsed = daysRaw ? parseInt(daysRaw, 10) : null
      const days =
        Number.isFinite(daysParsed) && daysParsed >= 1 && daysParsed <= 30 ? daysParsed : null

      const { data, error } = await supabase
        .from('reports')
        .insert([
          {
            pin,
            city: area ? area : `PIN ${pin}`,
            issue,
            user_id: user.id,
            user_email: user.email,
            delivery_days: days,
            company: reportCompany || null,
          },
        ])
        .select()
        .single()

      if (error || !data) {
        setSubmitError('Could not submit this report. Please try again.')
        return
      }

      setReports((prev) => [data, ...prev])
      setReportText('')
      setReportPin('')
      setReportCity('')
      setReportDeliveryDays('')
      setTrackPrefillContext(null)
      try {
        sessionStorage.removeItem(TRACK_REPORT_PREFILL_KEY)
      } catch {
        // Ignore private mode / storage failures.
      }

      setSubmitOk(true)
      window.setTimeout(() => setSubmitOk(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditReport = async (id) => {
    const next = editingText.trim()
    if (!next) return

    await supabase.from('reports').update({ issue: next }).eq('id', id)
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, issue: next } : r)))
    setEditingReportId(null)
    setEditingText('')
  }

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return
    await supabase.from('reports').delete().eq('id', id)
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  const handleVote = useCallback(
    async (r) => {
      if (!user) {
        setVoteError('Sign in with Google to upvote community reports.')
        onGoogleSignIn?.('/reports')
        return
      }

      if (votes[r.id] || voting[r.id]) return

      setVoteError(null)
      setVoting((prev) => ({ ...prev, [r.id]: true }))

      const { error } = await supabase
        .from('report_votes')
        .insert([{ report_id: r.id, user_id: user.id }])

      if (error) {
        const isDuplicate =
          error.code === '23505' || /duplicate|unique/i.test(String(error.message || ''))

        if (isDuplicate) {
          setVotes((prev) => ({ ...prev, [r.id]: true }))
          setVoteError('You already upvoted this report.')
        } else {
          setVoteError('Could not record your upvote right now. Please try again.')
        }

        const { data: latestReport } = await supabase
          .from('reports')
          .select('id, votes')
          .eq('id', r.id)
          .maybeSingle()

        if (latestReport) {
          setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, votes: latestReport.votes } : x)))
        }

        setVoting((prev) => {
          const next = { ...prev }
          delete next[r.id]
          return next
        })
        return
      }

      setVotes((prev) => ({ ...prev, [r.id]: true }))
      setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, votes: (x.votes || 0) + 1 } : x)))
      setVoting((prev) => {
        const next = { ...prev }
        delete next[r.id]
        return next
      })
    },
    [onGoogleSignIn, user, votes, voting],
  )

  return (
    <div className="page-root reports-page">
      <PageHeader
        icon={MessageSquare}
        title="Community reports"
        description="Report delivery delays, shortage pressure, and agency issues in your area."
      />

      <div className="page-section page-grid-form-feed reports-layout">
          <Card className="page-sticky-lg">
          <CardHeader
            kicker="Submit a report"
            title="Report an issue in your area"
            titleAs="h2"
            actions={
              user ? (
                <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
                  Signed in
                </span>
              ) : null
            }
          >
            <p className="type-card-copy mt-3 mb-0">
              Keep it factual. Add delivery days, agency name, or extra charges if you know them.
            </p>
          </CardHeader>

          {trackPrefillContext ? (
            <Callout tone="accent" className="mb-4 reports-prefill-callout" edge={false}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="kicker mb-2 text-[var(--accent)]">
                    From Booking Tracker
                  </p>
                  <p className="type-card-copy mb-1 text-[var(--text-primary)]">
                    Reporting for {trackPrefillContext.contextLabel || `PIN ${trackPrefillContext.pin}`}.
                  </p>
                  <p className="type-note mb-0">
                    We prefilled the area details from your Track check. Add only what you personally saw.
                  </p>
                </div>

                <button
                  type="button"
                  className="reports-prefill-callout__link"
                  onClick={() => {
                    setTrackPrefillContext(null)
                    try {
                      sessionStorage.removeItem(TRACK_REPORT_PREFILL_KEY)
                    } catch {
                      // Ignore private mode / storage failures.
                    }
                    onTrackBack?.()
                  }}
                >
                  Back to tracker
                </button>
              </div>
            </Callout>
          ) : null}

          {!authLoading && !user ? (
            <div className="text-center py-6">
                <div className="kicker text-[var(--text-muted)] mb-3">
                  Sign in required
                </div>
              <h2 className="type-card-title mb-2 m-0">
                Sign in to post a report
              </h2>
              <p className="type-card-copy mb-5">
                Sign in with Google so reports stay accountable and harder to spam.
              </p>
              <GoogleSignInButton
                className="w-full justify-center"
                onClick={() => onGoogleSignIn?.('/reports')}
              >
                Sign in with Google
              </GoogleSignInButton>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              <div>
                {submitError && (
                  <Callout tone="severe" className="mb-4">
                    <div className="type-card-copy text-[var(--text-primary)]">{submitError}</div>
                  </Callout>
                )}

                <Field id="report-pin" label="PIN code" meta="6 digits" required>
                  <input
                    className="input type-data-input"
                    placeholder="6-digit PIN"
                    value={reportPin}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setReportPin(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>

                <Field id="report-area" label="Area / colony" meta="Optional">
                  <input
                    className="input"
                    maxLength={100}
                    placeholder={`e.g. Vizag ${DOT} Gajuwaka`}
                    value={reportCity}
                    onChange={(e) => setReportCity(e.target.value)}
                  />
                </Field>

                <div className="field">
                  <div className="field__top">
                    <div className="field__label">LPG provider</div>
                    <div className="field__meta">Optional</div>
                  </div>
                  <CompanyPicker value={reportCompany} onChange={setReportCompany} compact={true} />
                </div>

                <Field id="report-issue" label="What is happening?" required>
                  <textarea
                    className="input resize-y"
                    maxLength={1000}
                    style={{ minHeight: 110 }}
                    placeholder={`e.g. No delivery in 12 days, driver demanding \u20B9100 extra\u2026`}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                  />
                </Field>

                <Field id="report-days" label="Delivery days" meta="Optional">
                  <input
                    className="input"
                    placeholder="e.g. 12"
                    value={reportDeliveryDays}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setReportDeliveryDays(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>

                <LiquidGlassBtn
                  className="w-full justify-center mt-2"
                  onClick={handleReport}
                  disabled={submitting || reportPin.trim().length !== 6 || !reportText.trim()}
                >
                  {submitOk ? (
                    'Submitted. Thank you.'
                  ) : submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="motion-safe:animate-spin" /> Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send size={16} /> Submit report
                    </span>
                  )}
                </LiquidGlassBtn>
              </div>
            </FadeIn>
          )}
        </Card>

        <div className="reports-feed min-w-0">
          <div className="reports-feed__header">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-[var(--accent)]" />
                <span className="kicker">
                  Recent reports
                </span>
              <span className="text-[var(--divider)] type-note" aria-hidden="true">
                {DOT}
              </span>
              <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                Most upvoted
              </span>
            </div>
            <div className="type-note shrink-0">
              {loading ? 'Loading...' : `${reports.length} shown`}
            </div>
          </div>

          {fetchError && (
            <Callout tone="active" className="mb-4">
              <div className="type-card-copy text-[var(--text-primary)]">{fetchError}</div>
            </Callout>
          )}

          {voteError && (
            <Callout tone="active" className="mb-4">
              <div className="type-card-copy text-[var(--text-primary)]">{voteError}</div>
            </Callout>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  variant="inset"
                  className="opacity-60 motion-safe:animate-pulse"
                  aria-hidden="true"
                >
                  <div className="kicker mb-3">Loading report</div>
                  <div className="h-4 w-40 rounded bg-[var(--bg-inset)] mb-3" />
                  <div className="h-3 w-3/4 rounded bg-[var(--bg-inset)] mb-2" />
                  <div className="h-3 w-2/3 rounded bg-[var(--bg-inset)]" />
                </Card>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState title="No reports yet" description="No one has reported an issue here yet." />
          ) : (
            <FadeIn delay={0.08}>
              <List
                as={motion.div}
                initial={shouldReduceMotion ? false : 'hidden'}
                animate={shouldReduceMotion ? undefined : 'visible'}
                variants={shouldReduceMotion ? undefined : staggerContainer(staggerRules.cards)}
              >
                {reports.map((r) => {
                  const area = displayArea(r)
                  const company = r.company ? companyMeta.get(r.company) : null
                  const rowStatus =
                    r.votes > 20 ? 'severe' : r.votes > 8 ? 'active' : r.votes > 3 ? 'early' : null

                  return (
                    <ListRow
                      key={r.id}
                      as={motion.article}
                      className="reports-row"
                      status={rowStatus}
                      interactive={true}
                      initial={shouldReduceMotion ? false : 'hidden'}
                      animate={shouldReduceMotion ? undefined : 'visible'}
                      variants={shouldReduceMotion ? undefined : fadeUp}
                      style={{ contentVisibility: 'auto' }}
                      badges={
                        <>
                          <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                            PIN {r.pin}
                          </span>
                          {company && (
                            <span className="badge text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)]">
                              {company.short || company.label}
                            </span>
                          )}
                          {r.delivery_days && (
                            <span className="badge text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)]">
                              {r.delivery_days} day{r.delivery_days === 1 ? '' : 's'}
                            </span>
                          )}
                        </>
                      }
                      meta={fmtDate(r.created_at)}
                      title={
                        <h3 className="type-list-title reports-row__title-text m-0">
                          {area || `PIN ${r.pin}`}
                        </h3>
                      }
                      actions={
                        user && r.user_id === user.id && editingReportId !== r.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReportId(r.id)
                                setEditingText(r.issue)
                              }}
                              className="icon-btn"
                              aria-label="Edit report"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(r.id)}
                              className="icon-btn icon-btn--danger"
                              aria-label="Delete report"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : null
                      }
                    >
                      {editingReportId === r.id ? (
                        <div>
                          <textarea
                            className="input resize-y mb-3"
                            style={{ minHeight: 96 }}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <LiquidGlassBtn
                              className="py-1.5 px-4"
                              onClick={() => handleEditReport(r.id)}
                            >
                              Save
                            </LiquidGlassBtn>
                            <button
                              type="button"
                              className="type-nav text-[var(--text-muted)] hover:text-[var(--text-primary)] px-4"
                              onClick={() => setEditingReportId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="type-card-copy reports-row__body-copy whitespace-pre-wrap mb-0">
                          {r.issue}
                        </p>
                      )}

                      <div className="reports-row__footer">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 1.08 }}
                          transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
                          onClick={() => handleVote(r)}
                          disabled={Boolean(votes[r.id] || voting[r.id])}
                          className={`reports-row__vote ${
                            !user
                              ? 'reports-row__vote--gated'
                              : votes[r.id]
                              ? 'reports-row__vote--voted'
                              : voting[r.id]
                                ? 'reports-row__vote--busy'
                                : ''
                          }`}
                        >
                          <ArrowUp
                            size={14}
                            className="reports-row__vote-icon"
                          />
                          <span className="reports-row__vote-copy">
                            <span className="reports-row__vote-count">
                              {r.votes}
                            </span>
                            <span className="reports-row__vote-label">
                              {!user
                                ? 'Sign in to upvote'
                                : `${r.votes === 1 ? 'Upvote' : 'Upvotes'}`}
                            </span>
                          </span>
                        </motion.button>

                        {r.votes > 20 && (
                          <span className="badge text-[var(--status-severe)] bg-[var(--status-severe-soft)] border border-[var(--status-severe-border)] flex items-center gap-2">
                            <span
                              className="w-1.5 h-1.5 bg-[var(--status-severe)] rounded-full motion-safe:animate-pulse"
                              aria-hidden="true"
                            />
                            Trending
                          </span>
                        )}
                      </div>
                    </ListRow>
                  )
                })}
              </List>
            </FadeIn>
          )}
        </div>
      </div>
    </div>
  )
}
