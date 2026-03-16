// src/components/shared/SectionMarker.jsx
import { StatusDot } from './StatusDot'

export function SectionMarker({ status = 'clear', label, sublabel }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <StatusDot status={status} size={7} />
      <div className="flex items-center gap-2">
        <span className="font-data text-[11px] font-semibold
                         uppercase tracking-[0.14em]
                         text-[var(--text-muted)]">
          LIVE
        </span>
        {label && (
          <>
            <span className="text-[var(--divider)] font-data text-[11px]">·</span>
            <span className="font-data text-[11px] font-semibold
                             uppercase tracking-[0.14em]
                             text-[var(--text-muted)]">
              {label}
            </span>
          </>
        )}
        {sublabel && (
          <>
            <span className="text-[var(--divider)] font-data text-[11px]">·</span>
            <span className="font-data text-[11px]
                             tracking-[0.08em]
                             text-[var(--text-muted)] opacity-60">
              {sublabel}
            </span>
          </>
        )}
      </div>
      {/* Horizontal rule extending right */}
      <div className="flex-1 h-px bg-[var(--divider)]" />
    </div>
  )
}

export default SectionMarker
