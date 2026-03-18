import React from 'react'
import { Shield, Users, Bell, AlertTriangle, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer'
import { FadeIn } from '../../components/motion/FadeIn'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const RUPEE = '\u20B9'
const EM_DASH = '\u2014'

export default function AdminTab({ data, loading, onLock }) {
  const { subscriptions = [], reportCount = 0, alertCount = 0 } = data || {}

  return (
    <div className="space-y-8 pb-12 w-full min-w-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 border-b border-[var(--border)] pb-6">
        <div>
          <button
            onClick={onLock}
            className="flex items-center gap-1.5 kicker hover:text-[var(--text-primary)] mb-4 transition-colors p-1 -ml-1"
          >
            <ArrowLeft size={14} /> Exit restricted mode
          </button>

          <h1 className="type-page-title text-[var(--status-early)] mb-2 flex items-center gap-3">
            <Shield size={28} className="text-[var(--status-early)]" />
            System Control
          </h1>
          <p className="type-page-desc text-[var(--status-early)] opacity-80 font-medium">
            Administrative overview. Authorized access only.
          </p>
        </div>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              title="Active alerts"
              titleAs="h3"
              meta={<Bell size={14} className="text-[var(--status-clear)]" aria-hidden="true" />}
            />
            <CardBody>
              <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                {loading ? EM_DASH : alertCount}
              </div>
              <div className="type-note mt-2">PINs being monitored</div>
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
              <div className="type-note mt-2">Active paid users</div>
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
            Live payment records synced from the Plus subscriber table.
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
                    <span className="motion-safe:animate-pulse">Loading directory...</span>
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
