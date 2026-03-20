import React from 'react'
import { Shield, Users, Bell, AlertTriangle, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer'
import { FadeIn } from '../../components/motion/FadeIn'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { PageHeader } from '../../components/ui/PageHeader'

const RUPEE = '\u20B9'
const EM_DASH = '\u2014'

export default function AdminTab({ data, loading, onLock }) {
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
            <button
              type="button"
              onClick={onLock}
              className="btn-ghost"
            >
              <ArrowLeft size={16} />
              <span>Lock admin</span>
            </button>
          )}
        />
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <StaggerItem>
          <Card variant="inset" edge status="active" className="h-full">
            <CardHeader
              kicker="Operations"
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
              kicker="Monitoring"
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
              kicker="Free flow"
              title="Free reminders"
              titleAs="h3"
              meta={<Users size={14} className="text-[var(--status-early)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : freeAlertCount}
              </div>
              <div className="type-note mt-2">WhatsApp-first free reminder signups</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="active" className="h-full">
            <CardHeader
              kicker="Dispatch queue"
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
              kicker="Delivery"
              title="Sent today"
              titleAs="h3"
              meta={<Bell size={14} className="text-[var(--status-clear)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : sentTodayCount}
              </div>
              <div className="type-note mt-2">WhatsApp reminders delivered today</div>
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card variant="inset" edge status="severe" className="h-full">
            <CardHeader
              kicker="Failures"
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
              kicker="Revenue"
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
          <div className="kicker mb-1">Access ledger</div>
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
