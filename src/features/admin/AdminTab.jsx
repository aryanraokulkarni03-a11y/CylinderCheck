import React from 'react';
import { Shield, Users, Bell, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerContainer';
import { FadeIn } from '../../components/motion/FadeIn';

export default function AdminTab({ data, loading, onLock }) {
  const { subscriptions = [], reportCount = 0, alertCount = 0 } = data || {};

  return (
    <div className="space-y-8 pb-12 w-full max-w-4xl mx-auto md:px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 border-b border-[var(--border)] pb-6">
        <div>
          <button 
            onClick={onLock}
            className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors p-1 -ml-1"
          >
            <ArrowLeft size={14} /> Exit restricted Mode
          </button>
          
          <h1 className="text-[clamp(24px,4vw,36px)] font-bold font-display tracking-tight text-[var(--status-early)] mb-2 flex items-center gap-3">
            <Shield size={28} className="text-[var(--status-early)]" />
            System Control
          </h1>
          <p className="text-[var(--status-early)] opacity-80 text-[15px] leading-relaxed font-medium">
            Administrative overview. Authorized access only.
          </p>
        </div>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StaggerItem>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-5">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)] mb-4">
              <AlertTriangle size={14} className="text-[var(--accent)]" /> Total Reports
            </div>
            <div className="text-4xl font-bold font-display tracking-tight text-[var(--text-primary)]">{loading ? '—' : reportCount}</div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mt-2">Community issues flagged</div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-5">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)] mb-4">
              <Bell size={14} className="text-[var(--status-clear)]" /> Active Alerts
            </div>
            <div className="text-4xl font-bold font-display tracking-tight text-[var(--text-primary)]">{loading ? '—' : alertCount}</div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mt-2">PINs being monitored</div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-5">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)] mb-4">
              <Users size={14} className="text-[var(--status-severe)]" /> Plus Subscriptions
            </div>
            <div className="text-4xl font-bold font-display tracking-tight text-[var(--text-primary)]">{loading ? '—' : subscriptions.length}</div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mt-2">Active paid users</div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.4} className="mt-8">
        <h2 className="text-[14px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-4">Subscribers Directory</h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] overflow-x-auto">
          <table className="w-full text-left relative min-w-[600px]">
            <thead className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)]">ID / Contact</th>
                <th className="px-5 py-3 text-[11px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)]">Payment ID</th>
                <th className="px-5 py-3 text-[11px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)]">Amount</th>
                <th className="px-5 py-3 text-[11px] font-bold tracking-widest uppercase font-data text-[var(--text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {loading ? (
                <tr>
                   <td colSpan="4" className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)] font-medium"><span className="animate-pulse">Loading directory...</span></td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)] font-medium">No active subscriptions.</td>
                </tr>
              ) : (
                subscriptions.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{s.contact}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-body">Joined {new Date(s.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-4 text-[12px] font-mono text-[var(--text-secondary)]">{s.razorpay_payment_id || "—"}</td>
                    <td className="px-5 py-4 text-[13px] font-bold text-[var(--text-primary)]">{s.amount ? `₹${s.amount}` : "—"}</td>
                    <td className="px-5 py-4">
                      <span className="bg-[rgba(45,92,58,0.1)] text-[var(--status-clear)] border border-[rgba(45,92,58,0.2)] text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-xs)] font-data inline-flex items-center gap-1.5">
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
