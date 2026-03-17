import React from 'react';
import { Shield, Users, Bell, AlertTriangle, ArrowLeft } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer';
import { FadeIn } from '../../components/motion/FadeIn';

export default function AdminTab({ data, loading, onLock }) {
  const { subscriptions = [], reportCount = 0, alertCount = 0 } = data || {};

  return (
    <div className="space-y-8 pb-12 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 border-b border-[var(--border)] pb-6">
        <div>
          <button 
            onClick={onLock}
            className="flex items-center gap-1.5 overline text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors p-1 -ml-1"
          >
            <ArrowLeft size={14} /> Exit restricted Mode
          </button>
          
          <h1 className="text-[var(--status-early)] mb-2 flex items-center gap-3">
            <Shield size={28} className="text-[var(--status-early)]" />
            System Control
          </h1>
          <p className="text-[var(--status-early)] opacity-80 leading-relaxed font-medium">
            Administrative overview. Authorized access only.
          </p>
        </div>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StaggerItem>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-5">
            <div className="flex items-center gap-2 overline text-[var(--text-muted)] mb-4">
              <AlertTriangle size={14} className="text-[var(--accent)]" /> Total Reports
            </div>
            <div className="stat text-[var(--fs-h1)] text-[var(--text-primary)]">{loading ? '—' : reportCount}</div>
            <div className="caption text-[var(--text-secondary)] mt-2">Community issues flagged</div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-5">
            <div className="flex items-center gap-2 overline text-[var(--text-muted)] mb-4">
              <Bell size={14} className="text-[var(--status-clear)]" /> Active Alerts
            </div>
            <div className="stat text-[var(--fs-h1)] text-[var(--text-primary)]">{loading ? '—' : alertCount}</div>
            <div className="caption text-[var(--text-secondary)] mt-2">PINs being monitored</div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-5">
            <div className="flex items-center gap-2 overline text-[var(--text-muted)] mb-4">
              <Users size={14} className="text-[var(--status-severe)]" /> Plus Subscriptions
            </div>
            <div className="stat text-[var(--fs-h1)] text-[var(--text-primary)]">{loading ? '—' : subscriptions.length}</div>
            <div className="caption text-[var(--text-secondary)] mt-2">Active paid users</div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.4} className="mt-8">
        <h2 className="text-[var(--fs-sm)] font-semibold font-display text-[var(--text-primary)] uppercase tracking-widest mb-4">Subscribers Directory</h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] overflow-x-auto">
          <table className="w-full text-left relative min-w-[600px]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
              <tr>
                <th className="px-5 py-3 text-[var(--fs-xs)] font-medium tracking-widest uppercase text-[var(--text-muted)]">ID / Contact</th>
                <th className="px-5 py-3 text-[var(--fs-xs)] font-medium tracking-widest uppercase text-[var(--text-muted)]">Payment ID</th>
                <th className="px-5 py-3 text-[var(--fs-xs)] font-medium tracking-widest uppercase text-[var(--text-muted)]">Amount</th>
                <th className="px-5 py-3 text-[var(--fs-xs)] font-medium tracking-widest uppercase text-[var(--text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {loading ? (
                <tr>
                   <td colSpan="4" className="px-5 py-8 text-center text-[var(--fs-sm)] text-[var(--text-muted)] font-medium"><span className="motion-safe:animate-pulse">Loading directory...</span></td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-[var(--fs-sm)] text-[var(--text-muted)] font-medium">No active subscriptions.</td>
                </tr>
              ) : (
                subscriptions.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-[var(--bg-raised)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-[var(--fs-sm)] font-medium text-[var(--text-primary)] mb-1">{s.contact}</div>
                      <div className="text-[var(--fs-xs)] text-[var(--text-muted)] font-body">Joined {new Date(s.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-4 text-[var(--fs-xs)] text-[var(--text-secondary)]">{s.razorpay_payment_id || "—"}</td>
                    <td className="px-5 py-4 price text-[var(--fs-sm)] text-[var(--text-primary)]">{s.amount ? `₹${s.amount}` : "—"}</td>
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
        </div>
      </FadeIn>
    </div>
  );
}
