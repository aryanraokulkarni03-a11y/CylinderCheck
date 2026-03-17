// src/components/shared/SectionMarker.jsx
import { StatusDot } from './StatusDot'

const SEP = '\u00B7'

export function SectionMarker({ status = 'clear', label, sublabel }) {
  return (
    <div className="flex items-center gap-3 mb-6 min-w-0">
      {/* Editorial kicker pill (replaces the old full-width rule that read as a generic underline) */}
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-1.5 min-w-0">
        <StatusDot status={status} size={7} />

        <span className="overline text-[var(--text-muted)]">
          LIVE
        </span>

        {label && (
          <>
            <span className="text-[var(--divider)] text-[var(--fs-xs)]" aria-hidden="true">
              {SEP}
            </span>
            <span className="overline text-[var(--text-muted)]">
              {label}
            </span>
          </>
        )}

        {sublabel && (
          <>
            <span className="text-[var(--divider)] text-[var(--fs-xs)]" aria-hidden="true">
              {SEP}
            </span>
            <span className="text-[var(--fs-xs)] tracking-[0.08em] text-[var(--text-muted)] opacity-60">
              {sublabel}
            </span>
          </>
        )}
      </div>

      {/* Optional short rule to keep rhythm without shouting “underline” */}
      <div
        className="hidden sm:block h-px flex-1 max-w-[180px] bg-gradient-to-r from-[var(--divider)] to-transparent opacity-70"
        aria-hidden="true"
      />
    </div>
  )
}

export default SectionMarker
