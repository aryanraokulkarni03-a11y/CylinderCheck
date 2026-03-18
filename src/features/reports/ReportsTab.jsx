// src/features/reports/ReportsTab.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import CompanyPicker, { COMPANY_PICKER_OPTS } from '../../components/shared/CompanyPicker'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import EmptyState from '../../components/shared/EmptyState'
import { AlertCircle, ArrowUp, Edit2, Loader2, Send, Trash2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { FadeIn } from '../../components/motion/FadeIn'
import { springs } from '../../lib/springs'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Callout } from '../../components/ui/Callout'
import { List } from '../../components/ui/List'
import { ListRow } from '../../components/ui/ListRow'

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

export default function ReportsTab({ user, authLoading, onGoogleSignIn }) {
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
      <PageHeader
        markerStatus="early"
        markerLabel="Community Reports"
        title="Community Reports"
        description="Flag delivery delays, shortages, and agency issues in your area. Real reports from real people."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start min-w-0">
        <div className="card lg:sticky lg:top-[calc(var(--topbar-height)+24px)]">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="kicker kicker--caps text-[var(--accent)]">
                Submit a report
              </div>
              <div className="text-[var(--fs-sm)] text-[var(--text-muted)] mt-1 leading-relaxed">
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
              <div className="kicker kicker--caps text-[var(--text-muted)] mb-3">
                Sign in required
              </div>
              <h2 className="font-display font-bold text-[var(--fs-body)] text-[var(--text-primary)] mb-2 m-0">
                Sign in to submit
              </h2>
              <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] mb-5 leading-relaxed">
                Reports require a Google account so the community stays spam-free and accountable.
              </p>
              <LiquidGlassBtn
                className="w-full justify-center"
                onClick={() => onGoogleSignIn?.('/reports')}
              >
                Sign in with Google {ARROW}
              </LiquidGlassBtn>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              <div>
                {submitError && (
                  <Callout tone="severe" className="mb-4">
                    <div className="text-[var(--fs-sm)] text-[var(--text-primary)]">{submitError}</div>
                  </Callout>
                )}

                <Field id="report-pin" label="PIN code" meta="6 digits" required>
                  <input
                    className="input tracking-[0.12em] text-[var(--text-data)]"
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
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-[var(--accent)]" />
              <span className="kicker kicker--caps">
                Reports feed
              </span>
              <span className="text-[var(--divider)] text-[var(--fs-xs)]" aria-hidden="true">
                {DOT}
              </span>
              <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                Top voted
              </span>
            </div>
            <div className="text-[var(--fs-xs)] text-[var(--text-muted)]">
              {loading ? 'Loading\u2026' : `${reports.length} shown`}
            </div>
          </div>

          {fetchError && (
            <Callout tone="active" className="mb-4">
              <div className="text-[var(--fs-sm)] text-[var(--text-primary)]">{fetchError}</div>
            </Callout>
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
              <List>
                {reports.map((r) => {
                  const area = displayArea(r)
                  const company = r.company ? companyMeta.get(r.company) : null
                  const rowStatus =
                    r.votes > 20 ? 'severe' : r.votes > 8 ? 'active' : r.votes > 3 ? 'early' : null

                  return (
                    <ListRow
                      key={r.id}
                      as="article"
                      status={rowStatus}
                      interactive={true}
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
                        <h3 className="text-[var(--fs-body)] font-semibold font-display text-[var(--text-primary)] leading-snug m-0">
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
                              className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                              aria-label="Edit report"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(r.id)}
                              className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-[var(--status-severe-border)] bg-[var(--status-severe-soft)] text-[var(--status-severe)] transition-colors hover:border-[var(--status-severe)]"
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
                              className="py-1.5 px-4 text-[var(--fs-xs)]"
                              onClick={() => handleEditReport(r.id)}
                            >
                              Save
                            </LiquidGlassBtn>
                            <button
                              type="button"
                              className="text-[var(--fs-xs)] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-4"
                              onClick={() => setEditingReportId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {r.issue}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-[var(--divider)] mt-4 gap-3">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 1.08 }}
                          transition={shouldReduceMotion ? { duration: 0.01 } : springs.delight}
                          onClick={() => handleVote(r)}
                          className={`inline-flex items-center gap-1.5 text-[var(--fs-xs)] font-medium uppercase tracking-[0.14em] px-3 py-2 rounded-full transition-colors ${
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
