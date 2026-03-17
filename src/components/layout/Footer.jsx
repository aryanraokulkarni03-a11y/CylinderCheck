// src/components/layout/Footer.jsx

import React from 'react'

const DOT = '\u00B7'
const COPY = '\u00A9'

export function Footer({ onSupportOpen }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 pt-10 border-t border-[var(--divider)]">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[64ch]">
          <div className="overline text-[var(--text-muted)] mb-2">
            Disclaimer
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed m-0">
            CylinderCheck is not affiliated with Indane (IndianOil), HP Gas, or Bharatgas. Intelligence is
            community-sourced and may be incomplete. Always verify availability and rates with your local agency.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <span className="overline">
            {COPY} {year} CylinderCheck
          </span>
          <span className="text-[var(--divider)]" aria-hidden="true">
            {DOT}
          </span>
          <button
            type="button"
            onClick={onSupportOpen}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            Support
          </button>
        </div>
      </div>
    </footer>
  )
}

export default Footer
