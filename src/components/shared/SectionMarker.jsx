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
            <span className="type-marker-sep" aria-hidden="true">
              {SEP}
            </span>
            <span className="overline text-[var(--text-muted)]">
              {label}
            </span>
          </>
        )}

        {sublabel && (
          <>
            <span className="type-marker-sep" aria-hidden="true">
              {SEP}
            </span>
            <span className="type-marker-note">
              {sublabel}
            </span>
          </>
        )}
      </div>

    </div>
  )
}

export default SectionMarker
