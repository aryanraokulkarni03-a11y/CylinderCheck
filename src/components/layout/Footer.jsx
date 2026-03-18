// src/components/layout/Footer.jsx

import React from 'react'

const DOT = '\u00B7'
const COPY = '\u00A9'

export function Footer({ onSupportOpen, onPrivacyOpen, onTermsOpen }) {
  const year = new Date().getFullYear()

  return (
    <footer className="footer-ledger">
      <div className="footer-ledger__notice">
        <div className="kicker footer-ledger__label">
          Independent data notice
        </div>
        <p className="footer-ledger__copy">
          CylinderCheck is not affiliated with Indane (IndianOil), HP Gas, or Bharatgas. Intelligence is
          community-sourced and may be incomplete. Always verify availability and rates with your local agency.
        </p>
      </div>

      <div className="footer-ledger__meta">
        <div className="footer-ledger__brand">
          <span className="kicker text-[var(--text-muted)]">
            {COPY} {year} CylinderCheck
          </span>
        </div>

        <div className="footer-ledger__links" aria-label="Footer links">
          <button
            type="button"
            onClick={onSupportOpen}
            className="footer-ledger__link"
          >
            Support
          </button>
          <span className="footer-ledger__dot" aria-hidden="true">
            {DOT}
          </span>
          <button
            type="button"
            onClick={onPrivacyOpen || onSupportOpen}
            className="footer-ledger__link"
          >
            Privacy
          </button>
          <span className="footer-ledger__dot" aria-hidden="true">
            {DOT}
          </span>
          <button
            type="button"
            onClick={onTermsOpen || onSupportOpen}
            className="footer-ledger__link"
          >
            Terms
          </button>
        </div>
      </div>
    </footer>
  )
}

export default Footer
