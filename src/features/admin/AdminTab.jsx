import React from 'react'
import { Shield, Users, Bell, AlertTriangle, ArrowLeft, FilePenLine, Sparkles } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer'
import { FadeIn } from '../../components/motion/FadeIn'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { PageHeader } from '../../components/ui/PageHeader'

const RUPEE = '\u20B9'
const EM_DASH = '\u2014'

export default function AdminTab({ data, loading, user, authLoading, onOpenEditorial, onLock }) {
  const {
    subscriptions = [],
    reportCount = 0,
    alertCount = 0,
    freeAlertCount = 0,
    pendingAlertCount = 0,
    failedAlertCount = 0,
    sentTodayCount = 0,
  } = data || {}

  return (
    <div className="page-root">
      <div className="border-b border-[var(--border)] pb-6">
        <PageHeader
          markerShowStatus={false}
          markerStatus="early"
          markerLabel="Admin"
          icon={Shield}
          title="Admin"
          description="Overview of reports, alerts, and paid subscribers. Authorized access only."
          actions={(
            <div className="editorial-page-header__actions">
              <button
                type="button"
                onClick={onOpenEditorial}
                className="btn-ghost"
              >
                <FilePenLine size={16} />
                <span>Editorial workspace</span>
              </button>
              <button
                type="button"
                onClick={onLock}
                className="btn-ghost"
              >
                <ArrowLeft size={16} />
                <span>Lock admin</span>
              </button>
            </div>
          )}
        />
      </div>

      <Card variant="featured" className="admin-editorial-launch">
        <CardHeader
          title="Editorial workspace"
          titleAs="h2"
          meta={<Sparkles size={14} className="text-[var(--accent)]" aria-hidden="true" />}
          actions={(
            <button
              type="button"
              onClick={onOpenEditorial}
              className="btn-ghost"
            >
              <span>Open workspace</span>
            </button>
          )}
        />
        <CardBody className="stack-copy">
          <p className="type-card-copy m-0">
            Review candidate stories, refine the CylinderCheck summary, and move approved stories into the live publication flow.
          </p>
          <div className="admin-editorial-launch__meta">
            <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
              Phase 2 live
            </span>
            <span className="type-note">
              {authLoading
                ? 'Checking editorial sign-in…'
                : user?.email
                  ? `Google signed in as ${user.email}`
                  : 'Google sign-in required for real approve and publish actions'}
            </span>
          </div>
        </CardBody>
      </Card>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <StaggerItem>
          <Card variant="inset" edge status="active" className="h-full">
            <CardHeader
              title="Total reports"
              titleAs="h3"
              meta={<AlertTriangle size={14} className="text-[var(--accent)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : reportCount}
              </div>
              <div className="type-note mt-2">Community issues flagged</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="clear" className="h-full">
            <CardHeader
              title="All alerts"
              titleAs="h3"
              meta={<Bell size={14} className="text-[var(--status-clear)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : alertCount}
              </div>
              <div className="type-note mt-2">All stored alert rows</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="early" className="h-full">
            <CardHeader
              title="Free reminders"
              titleAs="h3"
              meta={<Users size={14} className="text-[var(--status-early)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : freeAlertCount}
              </div>
              <div className="type-note mt-2">Email-first free reminder signups</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="active" className="h-full">
            <CardHeader
              title="Pending sends"
              titleAs="h3"
              meta={<Bell size={14} className="text-[var(--status-active)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : pendingAlertCount}
              </div>
              <div className="type-note mt-2">Rows waiting for the reminder job</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="clear" className="h-full">
            <CardHeader
              title="Sent today"
              titleAs="h3"
              meta={<Bell size={14} className="text-[var(--status-clear)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : sentTodayCount}
              </div>
              <div className="type-note mt-2">Reminder emails sent today</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="severe" className="h-full">
            <CardHeader
              title="Failed sends"
              titleAs="h3"
              meta={<AlertTriangle size={14} className="text-[var(--status-severe)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : failedAlertCount}
              </div>
              <div className="type-note mt-2">Rows that need retry or cleanup</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="early" className="h-full">
            <CardHeader
              title="Plus subscriptions"
              titleAs="h3"
              meta={<Users size={14} className="text-[var(--status-early)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : subscriptions.length}
              </div>
              <div className="type-note mt-2">Stored paid subscription records</div>
            </CardBody>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.4} className="mt-8">
        <div className="mb-4">
          <h2 className="type-list-title m-0">
            Subscribers directory
          </h2>
          <p className="type-note mt-2 mb-0">
            Payment records from the Plus subscriber table.
          </p>
        </div>
        <Card variant="inset" className="card--flush overflow-x-auto">
          <table className="w-full text-left relative min-w-[600px]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
              <tr>
                <th className="px-5 py-3 type-table-heading">
                  ID / Contact
                </th>
                <th className="px-5 py-3 type-table-heading">
                  Payment ID
                </th>
                <th className="px-5 py-3 type-table-heading">
                  Amount
                </th>
                <th className="px-5 py-3 type-table-heading">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center type-card-copy--compact font-medium">
                    <span className="motion-safe:animate-pulse">Loading subscribers...</span>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center type-card-copy--compact font-medium">
                    No active subscriptions.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-[var(--bg-raised)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="type-table-value mb-1">
                        {s.contact}
                      </div>
                      <div className="type-note">
                        Joined {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 type-table-cell">
                      {s.razorpay_payment_id || EM_DASH}
                    </td>
                    <td className="px-5 py-4 type-table-value">
                      {s.amount ? `${RUPEE}${s.amount}` : EM_DASH}
                    </td>
                    <td className="px-5 py-4">
                      <span className="badge bg-[var(--status-clear-soft)] text-[var(--status-clear)] border border-[var(--status-clear-border)] inline-flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[var(--status-clear)]" /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </FadeIn>
    </div>
  )
}
