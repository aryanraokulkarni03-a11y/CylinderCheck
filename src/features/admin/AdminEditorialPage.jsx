import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Archive,
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  FilePenLine,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import { Field } from '../../components/ui/Field'
import { PillRow } from '../../components/ui/PillRow'
import EmptyState from '../../components/shared/EmptyState'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import { StatCard } from '../../components/ui/StatCard'
import { supabase } from '../../supabaseClient'

const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'Needs review' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
]

const ROLE_CAN_PUBLISH = new Set(['publisher', 'admin'])

function formatTimestamp(value, options = {}) {
  if (!value) return 'Not yet'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Not yet'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

function formatDisplayLocation(item) {
  const city = String(item?.city || '').trim()
  const state = String(item?.state || '').trim()
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return 'National'
}

function formatConfidence(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return `${Math.round(numeric * 100)}%`
}

function reviewTone(item) {
  if (item.publishStatus === 'published') return 'clear'
  if (item.publishStatus === 'archived') return 'early'
  if (item.reviewStatus === 'rejected') return 'severe'
  if (item.reviewStatus === 'approved') return 'active'
  return 'early'
}

function statusLabel(item) {
  if (item.publishStatus === 'published') return 'Published'
  if (item.publishStatus === 'archived') return 'Archived'
  if (item.reviewStatus === 'rejected') return 'Rejected'
  if (item.reviewStatus === 'approved') return 'Approved'
  if (item.reviewStatus === 'needs_review') return 'Needs review'
  return 'Pending review'
}

function searchCandidate(item, query) {
  const haystack = [
    item.headline,
    item.sourceName,
    item.sourceDomain,
    item.category,
    item.city,
    item.state,
    item.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function matchesFilter(item, filter) {
  if (filter === 'all') return true
  if (filter === 'review') {
    return item.reviewStatus === 'pending' || item.reviewStatus === 'needs_review'
  }
  if (filter === 'published') return item.publishStatus === 'published'
  if (filter === 'rejected') return item.reviewStatus === 'rejected'
  if (filter === 'archived') return item.publishStatus === 'archived'
  return true
}

function buildFormState(candidate) {
  if (!candidate) {
    return {
      headline: '',
      deck: '',
      bodyMarkdown: '',
      reviewNotes: '',
      rejectionReason: '',
    }
  }

  return {
    headline: candidate.headline || '',
    deck: candidate.deck || '',
    bodyMarkdown: candidate.bodyMarkdown || '',
    reviewNotes: candidate.reviewNotes || '',
    rejectionReason: candidate.rejectionReason || '',
  }
}

function EmptyEditorialIcon() {
  return <FilePenLine size={30} aria-hidden="true" />
}

export default function AdminEditorialPage({
  user,
  authLoading,
  onGoogleSignIn,
  onBack,
  onLock,
}) {
  const [items, setItems] = useState([])
  const [adminRole, setAdminRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('review')
  const [search, setSearch] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [form, setForm] = useState(buildFormState(null))
  const [dirty, setDirty] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [submittingAction, setSubmittingAction] = useState('')

  const deferredSearch = useDeferredValue(search)
  const normalizedSearch = deferredSearch.trim().toLowerCase()

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  )

  const counts = useMemo(() => {
    const summary = {
      review: 0,
      published: 0,
      rejected: 0,
      archived: 0,
    }

    for (const item of items) {
      if (item.publishStatus === 'archived') {
        summary.archived += 1
        continue
      }
      if (item.publishStatus === 'published') {
        summary.published += 1
        continue
      }
      if (item.reviewStatus === 'rejected') {
        summary.rejected += 1
        continue
      }
      summary.review += 1
    }

    return summary
  }, [items])

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false
      if (!normalizedSearch) return true
      return searchCandidate(item, normalizedSearch)
    })
  }, [filter, items, normalizedSearch])

  const canPublish = ROLE_CAN_PUBLISH.has(adminRole)
  const hasEditorialAccess = user && !error.includes('Editorial access denied')

  const syncSelectedCandidate = useCallback((nextItems, preserveSelection = true) => {
    startTransition(() => {
      setSelectedId((current) => {
        if (preserveSelection && current && nextItems.some((item) => item.id === current)) {
          return current
        }
        return nextItems[0]?.id ?? null
      })
    })
  }, [])

  const invokeEditorial = useCallback(async (action, payload = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    if (!accessToken) {
      throw new Error('Sign in with Google to access editorial tools.')
    }

    const response = await fetch(`${SUPABASE_FUNC_URL}/news-editorial`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    })

    const text = await response.text()
    let payloadData = null

    try {
      payloadData = text ? JSON.parse(text) : null
    } catch {
      payloadData = null
    }

    if (!response.ok || !payloadData?.ok) {
      throw new Error(payloadData?.error || 'Editorial request failed.')
    }

    return payloadData
  }, [])

  const loadWorkspace = useCallback(async ({ background = false, preserveSelection = true } = {}) => {
    if (!user) {
      setItems([])
      setAdminRole('')
      setSelectedId(null)
      setLoading(false)
      setRefreshing(false)
      setError('')
      return
    }

    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const result = await invokeEditorial('list')
      const nextItems = Array.isArray(result.candidates) ? result.candidates : []
      setItems(nextItems)
      setAdminRole(result.admin?.role || '')
      syncSelectedCandidate(nextItems, preserveSelection)
    } catch (loadError) {
      setItems([])
      setSelectedId(null)
      setError(loadError.message || 'Could not load the editorial workspace right now.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [invokeEditorial, syncSelectedCandidate, user])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    setForm(buildFormState(selectedItem))
    setDirty(false)
    setActionError('')
  }, [selectedItem])

  useEffect(() => {
    if (!visibleItems.length) return
    if (visibleItems.some((item) => item.id === selectedId)) return
    setSelectedId(visibleItems[0].id)
  }, [selectedId, visibleItems])

  useEffect(() => {
    if (!actionNotice) return undefined
    const timeout = window.setTimeout(() => setActionNotice(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [actionNotice])

  const handleSelectCandidate = useCallback((candidateId, openDetail = false) => {
    if (candidateId === selectedId) {
      if (openDetail) setMobileDetailOpen(true)
      return
    }

    if (dirty && !window.confirm('Discard your unsaved editorial changes?')) {
      return
    }

    startTransition(() => {
      setSelectedId(candidateId)
      if (openDetail) setMobileDetailOpen(true)
    })
  }, [dirty, selectedId])

  const handleCloseMobileDetail = useCallback(() => {
    if (dirty && !window.confirm('Discard your unsaved editorial changes?')) {
      return
    }
    setMobileDetailOpen(false)
  }, [dirty])

  const handleFieldChange = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setDirty(true)
    setActionError('')
  }, [])

  const handleAction = useCallback(async (action) => {
    if (!selectedItem) return

    setSubmittingAction(action)
    setActionError('')

    try {
      await invokeEditorial(action, {
        candidateId: selectedItem.id,
        headline: form.headline.trim() || selectedItem.headline,
        deck: form.deck,
        bodyMarkdown: form.bodyMarkdown,
        reviewNotes: form.reviewNotes,
        rejectionReason: form.rejectionReason,
      })

      await loadWorkspace({ background: true, preserveSelection: true })
      setDirty(false)
      setActionNotice(
        action === 'approve'
          ? 'Story approved and published.'
          : action === 'reject'
            ? 'Candidate rejected and kept out of public news.'
            : 'Story archived.',
      )

      if (action === 'approve' || action === 'reject' || action === 'archive') {
        setMobileDetailOpen(false)
      }
    } catch (mutationError) {
      setActionError(mutationError.message || 'Could not complete that editorial action.')
    } finally {
      setSubmittingAction('')
    }
  }, [form, invokeEditorial, loadWorkspace, selectedItem])

  const detailStatusTone = selectedItem ? reviewTone(selectedItem) : 'early'

  return (
    <div className="page-root editorial-workspace">
      <PageHeader
        markerLabel="Editorial"
        markerStatus={selectedItem ? detailStatusTone : 'early'}
        icon={FilePenLine}
        title="Editorial workspace"
        description="Review candidate stories quickly. Approve publishes immediately, reject keeps the story out of public news."
        actions={(
          <div className="editorial-page-header__actions">
            <button type="button" onClick={onBack} className="btn-ghost">
              <ArrowLeft size={16} />
              <span>Back to admin</span>
            </button>
            <button type="button" onClick={onLock} className="btn-ghost">
              <Lock size={16} />
              <span>Lock admin</span>
            </button>
          </div>
        )}
      />

      {!authLoading && !user ? (
        <Card variant="featured">
          <CardHeader
            title="Sign in for the editorial workspace"
            meta={<span className="reading-meta">Authenticated publishing required</span>}
          />
          <CardBody className="stack-copy">
            <p className="type-reading-copy m-0">
              The admin shell is open, but real editorial actions still require your Supabase-authenticated Google account.
            </p>
            <GoogleSignInButton
              className="w-full justify-center sm:w-auto"
              onClick={() => onGoogleSignIn?.('/admin/editorial')}
            />
          </CardBody>
        </Card>
      ) : null}

      {!authLoading && user && error ? (
        <Callout tone="severe" className="editorial-workspace__callout">
          <div className="stack-copy stack-copy--tight">
            <div className="type-card-title">Editorial access is not available for this account</div>
            <div className="type-card-copy text-[var(--text-primary)]">
              {error}
            </div>
          </div>
        </Callout>
      ) : null}

      {!authLoading && hasEditorialAccess ? (
        <>
          <div className="editorial-overview-grid">
            <StatCard value={counts.review} label="Needs review" status="early" />
            <StatCard value={counts.published} label="Published" status="clear" />
            <StatCard value={counts.rejected} label="Rejected" status="severe" />
            <StatCard value={counts.archived} label="Archived" status="active" />
          </div>

          <div className="editorial-workspace__layout">
            <Card
              variant="raised"
              className="editorial-queue page-sticky-lg"
            >
              <CardHeader
                title="Candidate queue"
                meta={<span className="reading-meta">{items.length} total stories</span>}
                actions={(
                  <button
                    type="button"
                    onClick={() => loadWorkspace({ background: true, preserveSelection: true })}
                    disabled={refreshing}
                    className="btn-ghost editorial-refresh-btn"
                  >
                    {refreshing ? <Loader2 size={16} className="motion-safe:animate-spin" /> : <RefreshCw size={16} />}
                    <span>Refresh</span>
                  </button>
                )}
              />

              <CardBody className="editorial-queue__body">
                <div className="editorial-search">
                  <Search size={16} className="editorial-search__icon" aria-hidden="true" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input editorial-search__input"
                    placeholder="Search headline, source, category, or city"
                  />
                </div>

                <PillRow
                  ariaLabel="Filter editorial candidates"
                  value={filter}
                  onChange={(next) => setFilter(next)}
                  items={FILTER_OPTIONS}
                />

                <div className="editorial-queue__meta">
                  <span className="type-note">
                    Signed in as {user.email}
                  </span>
                  <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                    {adminRole || 'editor'}
                  </span>
                </div>

                {loading ? (
                  <div className="editorial-candidate-skeletons" aria-hidden="true">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="editorial-candidate-skeleton card card--inset motion-safe:animate-pulse">
                        <div className="editorial-candidate-skeleton__line editorial-candidate-skeleton__line--badge" />
                        <div className="editorial-candidate-skeleton__line editorial-candidate-skeleton__line--title" />
                        <div className="editorial-candidate-skeleton__line" />
                        <div className="editorial-candidate-skeleton__line editorial-candidate-skeleton__line--short" />
                      </div>
                    ))}
                  </div>
                ) : !visibleItems.length ? (
                  <EmptyState
                    title="No candidates match this view"
                    description="Adjust the status filter or search term to bring stories back into the editorial queue."
                    iconSlot={<EmptyEditorialIcon />}
                  />
                ) : (
                  <div className="editorial-candidate-list">
                    {visibleItems.map((item) => {
                      const tone = reviewTone(item)
                      const isSelected = selectedId === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectCandidate(item.id, true)}
                          className={`editorial-candidate-card editorial-candidate-card--${tone}${isSelected ? ' is-selected' : ''}`}
                        >
                          <div className="editorial-candidate-card__top">
                            <span className={`badge editorial-status-badge editorial-status-badge--${tone}`}>
                              {statusLabel(item)}
                            </span>
                            <span className="type-note">
                              {formatTimestamp(item.publishedSourceAt, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <h3 className="editorial-candidate-card__title">
                            {item.headline}
                          </h3>

                          <div className="editorial-candidate-card__meta">
                            <span>{item.sourceName}</span>
                            <span aria-hidden="true">/</span>
                            <span>{formatDisplayLocation(item)}</span>
                          </div>

                          <div className="editorial-candidate-card__chips">
                            <span className="badge text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)]">
                              {item.category}
                            </span>
                            <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">
                              Source {formatConfidence(item.sourceConfidence)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            <aside className={`editorial-detail-shell${mobileDetailOpen ? ' is-open' : ''}`}>
              <Card variant="featured" className="editorial-detail">
                <CardHeader
                  title={selectedItem ? 'Editorial detail' : 'Select a story'}
                  meta={selectedItem ? <span className="reading-meta">{statusLabel(selectedItem)}</span> : null}
                  actions={(
                    <button
                      type="button"
                      onClick={handleCloseMobileDetail}
                      className="btn-ghost editorial-detail__close lg:hidden"
                    >
                      <ArrowLeft size={16} />
                      <span>Queue</span>
                    </button>
                  )}
                />

                {!selectedItem ? (
                  <CardBody>
                    <EmptyState
                      title="Pick a candidate"
                      description="Open a story from the queue to review, refine, approve, reject, or archive it."
                      iconSlot={<EmptyEditorialIcon />}
                    />
                  </CardBody>
                ) : (
                  <CardBody className="editorial-detail__body">
                    {actionNotice ? (
                      <Callout tone="clear" edge={false}>
                        <div className="type-card-copy text-[var(--text-primary)]">{actionNotice}</div>
                      </Callout>
                    ) : null}

                    {actionError ? (
                      <Callout tone="severe" edge={false}>
                        <div className="type-card-copy text-[var(--text-primary)]">{actionError}</div>
                      </Callout>
                    ) : null}

                    <section className="editorial-story-preview">
                      <div className="editorial-story-preview__eyebrow">
                        <span className={`badge editorial-status-badge editorial-status-badge--${detailStatusTone}`}>
                          {statusLabel(selectedItem)}
                        </span>
                        <span className="badge text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)]">
                          {selectedItem.category}
                        </span>
                      </div>

                      <div className="stack-copy stack-copy--tight">
                        <h2 className="editorial-story-preview__title">
                          {selectedItem.headline}
                        </h2>
                        {selectedItem.deck ? (
                          <p className="type-card-copy editorial-story-preview__summary mb-0">
                            {selectedItem.deck}
                          </p>
                        ) : (
                          <p className="type-note editorial-story-preview__summary mb-0">
                            Optional refinements like a deck or short CylinderCheck note can be added if this story needs more context.
                          </p>
                        )}
                      </div>

                      <div className="editorial-story-preview__meta-grid">
                        <div className="editorial-story-preview__meta-card">
                          <span className="kicker kicker--caps">Source</span>
                          <div className="type-card-title">{selectedItem.sourceName}</div>
                          <div className="type-note">{selectedItem.sourceDomain || 'External source'}</div>
                        </div>
                        <div className="editorial-story-preview__meta-card">
                          <span className="kicker kicker--caps">Location</span>
                          <div className="type-card-title">{formatDisplayLocation(selectedItem)}</div>
                          <div className="type-note">Source confidence {formatConfidence(selectedItem.sourceConfidence)}</div>
                        </div>
                      </div>

                      <a
                        href={selectedItem.canonicalSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="editorial-source-link"
                      >
                        <span>Open original source</span>
                        <ExternalLink size={15} />
                      </a>
                    </section>

                    <details className="editorial-refine-disclosure">
                      <summary className="editorial-refine-disclosure__summary">
                        <span>Refine story details</span>
                        <span className="type-note">Optional</span>
                      </summary>

                      <section className="editorial-form-grid">
                        <Field label="Headline" meta="Editable publication polish">
                          <input
                            value={form.headline}
                            onChange={(event) => handleFieldChange('headline', event.target.value)}
                            className="input"
                            placeholder="Refine the headline if needed"
                          />
                        </Field>

                        <Field label="Deck" meta="Optional published card summary">
                          <textarea
                            value={form.deck}
                            onChange={(event) => handleFieldChange('deck', event.target.value)}
                            className="input resize-y"
                            style={{ minHeight: 96 }}
                            placeholder="Add a short deck if this story needs more context"
                          />
                        </Field>

                        <Field label="CylinderCheck note" meta="Optional editorial context">
                          <textarea
                            value={form.bodyMarkdown}
                            onChange={(event) => handleFieldChange('bodyMarkdown', event.target.value)}
                            className="input resize-y"
                            style={{ minHeight: 150 }}
                            placeholder="Add a concise note with source context if needed"
                          />
                        </Field>

                        <Field label="Review notes" meta="Private workflow notes">
                          <textarea
                            value={form.reviewNotes}
                            onChange={(event) => handleFieldChange('reviewNotes', event.target.value)}
                            className="input resize-y"
                            style={{ minHeight: 110 }}
                            placeholder="Optional private notes"
                          />
                        </Field>
                      </section>
                    </details>

                    <section className="editorial-detail__audit">
                      <div className="editorial-audit-card">
                        <span className="kicker kicker--caps">Source published</span>
                        <span className="type-note">{formatTimestamp(selectedItem.publishedSourceAt)}</span>
                      </div>
                      <div className="editorial-audit-card">
                        <span className="kicker kicker--caps">Reviewed</span>
                        <span className="type-note">{formatTimestamp(selectedItem.reviewedAt)}</span>
                      </div>
                      <div className="editorial-audit-card">
                        <span className="kicker kicker--caps">Published</span>
                        <span className="type-note">{formatTimestamp(selectedItem.publishedAt)}</span>
                      </div>
                    </section>

                    <div className="editorial-action-bar">
                      {selectedItem.publishStatus === 'published' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAction('archive')}
                            disabled={submittingAction === 'archive'}
                            className="btn-ghost editorial-action-btn editorial-action-btn--warning"
                          >
                            {submittingAction === 'archive' ? <Loader2 size={16} className="motion-safe:animate-spin" /> : <Archive size={16} />}
                            <span>Archive story</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAction('reject')}
                            disabled={submittingAction === 'reject'}
                            className="btn-ghost editorial-action-btn editorial-action-btn--danger"
                          >
                            {submittingAction === 'reject' ? <Loader2 size={16} className="motion-safe:animate-spin" /> : <XCircle size={16} />}
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction('approve')}
                            disabled={!canPublish || submittingAction === 'approve'}
                            className="btn-ghost editorial-action-btn"
                          >
                            {submittingAction === 'approve' ? <Loader2 size={16} className="motion-safe:animate-spin" /> : <CheckCheck size={16} />}
                            <span>Approve</span>
                          </button>
                          {canPublish ? (
                            <div className="editorial-publisher-note editorial-publisher-note--quiet">
                              <Sparkles size={16} />
                              <span>Approve publishes immediately.</span>
                            </div>
                          ) : (
                            <div className="editorial-publisher-note">
                              <ShieldCheck size={16} />
                              <span>Publisher role needed to approve into public news.</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardBody>
                )}
              </Card>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}
