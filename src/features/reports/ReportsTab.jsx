// src/features/reports/ReportsTab.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import CompanyPicker, { COMPANY_PICKER_OPTS } from '../../components/shared/CompanyPicker'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import EmptyState from '../../components/shared/EmptyState'
import { AlertCircle, ArrowUp, Edit2, Loader2, Send, Trash2 } from 'lucide-react'
import { SectionMarker } from '../../components/shared/SectionMarker'
import { motion, useReducedMotion } from 'motion/react'
import { FadeIn } from '../../components/motion/FadeIn'
import { springs } from '../../lib/springs'

const ARROW = '\u2192'
const DOT = '\u00B7'

const CC_USER_VERSION = 'v1'
const CC_LS_KEY = `cc-user:${CC_USER_VERSION}`

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

export default function ReportsTab({ user, authLoading }) {
  const shouldReduceMotion = useReducedMotion()

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

  const [editingReportId, setEditingReportId] = useState(null)
  const [editingText, setEditingText] = useState('')

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
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('votes', { ascending: false })
        .limit(30)

      if (!alive) return

      if (error) {
        setFetchError('Could not load community reports right now.')
        setReports([])
        setLoading(false)
        return
      }

      setReports(Array.isArray(data) ? data : [])
      setLoading(false)
    }

    fetchReports()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    try {
      const prev = safeJsonParse(localStorage.getItem(CC_LS_KEY) || '') || {}
      localStorage.setItem(CC_LS_KEY, JSON.stringify({ ...prev, company: reportCompany || null }))
    } catch {
      // Private mode / storage blocked.
    }
  }, [reportCompany])

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
      if (votes[r.id]) return

      setVotes((prev) => ({ ...prev, [r.id]: true }))
      setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, votes: x.votes + 1 } : x)))
      await supabase.from('reports').update({ votes: r.votes + 1 }).eq('id', r.id)
    },
    [votes],
  )

  return (
    <div className="w-full min-w-0">
      <SectionMarker status="early" label="Community Reports" />

      <h1
        className="font-display font-bold text-[clamp(24px,4vw,36px)]
                   tracking-[-0.03em] text-[var(--text-primary)]
                   mb-2 leading-[1.1]"
      >
        Community Reports
      </h1>
      <p className="text-[var(--text-secondary)] text-[15px] mb-6 max-w-[560px]">
        Flag delivery delays, shortages, and agency issues in your area. Real reports from real people.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start min-w-0">
        <div className="card lg:sticky lg:top-[calc(var(--topbar-height)+24px)]">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="overline text-[var(--accent)]">
                Submit a report
              </div>
              <div className="text-[13px] text-[var(--text-muted)] mt-1 leading-relaxed">
                Keep it factual. If you can, add delivery days and your LPG provider.
              </div>
            </div>

            {user && (
              <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
                Signed in
              </span>
            )}
          </div>

          {!authLoading && !user ? (
            <div className="text-center py-6">
              <div className="overline text-[var(--text-muted)] mb-3">
                Sign in required
              </div>
              <h2 className="font-display font-bold text-[16px] text-[var(--text-primary)] mb-2 m-0">
                Sign in to submit
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
                Reports require a Google account so the community stays spam-free and accountable.
              </p>
              <LiquidGlassBtn
                className="w-full justify-center"
                onClick={() => {
                  try {
                    sessionStorage.setItem('cc-post-auth-tab', 'community')
                  } catch {
                    // Private mode.
                  }
                  supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                  })
                }}
              >
                Sign in with Google {ARROW}
              </LiquidGlassBtn>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              <div className="space-y-4">
                {submitError && (
                  <div className="rounded-md border border-[var(--status-severe-border)] bg-[var(--status-severe-soft)] px-3 py-2 text-[13px] text-[var(--text-primary)]">
                    {submitError}
                  </div>
                )}

                <div>
                  <label
                    className="block text-[var(--text-secondary)] mb-2"
                    htmlFor="report-pin"
                  >
                    PIN code <span className="text-[var(--text-muted)]">*</span>
                  </label>
                  <input
                    id="report-pin"
                    className="input tracking-[0.12em] text-[var(--text-data)]"
                    placeholder="6-digit PIN"
                    value={reportPin}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setReportPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div>
                  <label
                    className="block text-[var(--text-secondary)] mb-2"
                    htmlFor="report-area"
                  >
                    Area / colony{' '}
                    <span className="caption text-[var(--text-muted)] tracking-normal normal-case">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="report-area"
                    className="input"
                    placeholder={`e.g. Vizag ${DOT} Gajuwaka`}
                    value={reportCity}
                    onChange={(e) => setReportCity(e.target.value)}
                  />
                </div>

                <CompanyPicker value={reportCompany} onChange={setReportCompany} compact={true} />

                <div>
                  <label
                    className="block text-[var(--text-secondary)] mb-2"
                    htmlFor="report-issue"
                  >
                    What is happening? <span className="text-[var(--text-muted)]">*</span>
                  </label>
                  <textarea
                    id="report-issue"
                    className="input resize-y"
                    style={{ minHeight: 110 }}
                    placeholder={`e.g. No delivery in 12 days, driver demanding \u20B9100 extra\u2026`}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    className="block text-[var(--text-secondary)] mb-2"
                    htmlFor="report-days"
                  >
                    Delivery days{' '}
                    <span className="caption text-[var(--text-muted)] tracking-normal normal-case">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="report-days"
                    className="input"
                    placeholder="e.g. 12"
                    value={reportDeliveryDays}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setReportDeliveryDays(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

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
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-[var(--accent)]" />
              <span className="overline text-[var(--text-muted)]">
                Reports feed
              </span>
              <span className="text-[var(--divider)] text-[11px]" aria-hidden="true">
                {DOT}
              </span>
              <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                Top voted
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {loading ? 'Loading\u2026' : `${reports.length} shown`}
            </div>
          </div>

          {fetchError && (
            <div className="mb-4 rounded-md border border-[var(--status-active-border)] bg-[var(--status-active-soft)] px-3 py-2 text-[13px] text-[var(--text-primary)]">
              {fetchError}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="card opacity-60 motion-safe:animate-pulse"
                  aria-hidden="true"
                >
                  <div className="h-4 w-40 rounded bg-[var(--bg-inset)] mb-3" />
                  <div className="h-3 w-3/4 rounded bg-[var(--bg-inset)] mb-2" />
                  <div className="h-3 w-2/3 rounded bg-[var(--bg-inset)]" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState title="No reports yet" description="Be the first to flag an issue in your area." />
          ) : (
            <FadeIn delay={0.08}>
              <div className="space-y-4">
                {reports.map((r) => {
                  const area = displayArea(r)
                  const company = r.company ? companyMeta.get(r.company) : null

                  return (
                    <article
                      key={r.id}
                      className="card relative group"
                      style={{ contentVisibility: 'auto' }}
                    >
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-[var(--text-muted)] font-body font-medium">
                            {fmtDate(r.created_at)}
                          </span>

                          {user && r.user_id === user.id && editingReportId !== r.id && (
                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReportId(r.id)
                                  setEditingText(r.issue)
                                }}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
                                aria-label="Edit report"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(r.id)}
                                className="text-[var(--status-severe)] hover:bg-[var(--status-severe-soft)] rounded p-1"
                                aria-label="Delete report"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {area && (
                        <div className="text-[15px] font-bold font-display text-[var(--text-primary)] mb-2 tracking-tight">
                          {area}
                        </div>
                      )}

                      {editingReportId === r.id ? (
                        <div className="mt-2 mb-4">
                          <textarea
                            className="input resize-y mb-3"
                            style={{ minHeight: 96 }}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <LiquidGlassBtn
                              className="py-1.5 px-4 text-[12px]"
                              onClick={() => handleEditReport(r.id)}
                            >
                              Save
                            </LiquidGlassBtn>
                            <button
                              type="button"
                              className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-4"
                              onClick={() => setEditingReportId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {r.issue}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-[var(--divider)] mt-4">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 1.08 }}
                          transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
                          onClick={() => handleVote(r)}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] px-3 py-2 rounded-full transition-colors ${
                            votes[r.id]
                              ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                              : 'bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          <ArrowUp
                            size={14}
                            className={
                              votes[r.id] ? 'text-[var(--text-on-accent)]' : 'text-[var(--text-muted)]'
                            }
                          />
                          {r.votes} UPVOTE{r.votes !== 1 ? 'S' : ''}
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
                    </article>
                  )
                })}
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </div>
  )
}
