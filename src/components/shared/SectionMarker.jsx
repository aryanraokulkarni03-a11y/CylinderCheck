// src/components/shared/SectionMarker.jsx
import { StatusDot } from './StatusDot'

const SEP = '\u00B7'

export function SectionMarker({ status = 'clear', label, sublabel }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <StatusDot status={status} size={7} />

      <div className="flex items-center gap-2">
        <span
          className="overline text-[var(--text-muted)]"
        >
          LIVE
        </span>

        {label && (
          <>
            <span className="text-[var(--divider)] text-[11px]" aria-hidden="true">
              {SEP}
            </span>
            <span
              className="overline text-[var(--text-muted)]"
            >
              {label}
            </span>
          </>
        )}

        {sublabel && (
          <>
            <span className="text-[var(--divider)] text-[11px]" aria-hidden="true">
              {SEP}
            </span>
            <span
              className="text-[11px] tracking-[0.08em] text-[var(--text-muted)] opacity-60"
            >
              {sublabel}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 h-px bg-[var(--divider)]" />
    </div>
  )
}

export default SectionMarker
