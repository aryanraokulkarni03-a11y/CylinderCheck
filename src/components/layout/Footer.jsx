// src/components/layout/Footer.jsx

import React from 'react'
import { NavLink } from 'react-router-dom'

const DOT = '\u00B7'
const COPY = '\u00A9'

export function Footer() {
  const year = new Date().getFullYear()
  const linkClassName = ({ isActive }) =>
    `footer-ledger__link${isActive ? ' footer-ledger__link--active' : ''}`

  return (
    <footer className="footer-ledger">
      <div className="footer-ledger__notice">
        <div className="kicker footer-ledger__label">
          Independent data notice
        </div>
        <p className="footer-ledger__copy">
          CylinderCheck is not affiliated with Indane (IndianOil), HP Gas, or Bharatgas. Some data is
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
          <NavLink to="/support" className={linkClassName}>
            Support
          </NavLink>
          <span className="footer-ledger__dot" aria-hidden="true">
            {DOT}
          </span>
          <NavLink to="/cities" className={linkClassName}>
            Cities
          </NavLink>
          <span className="footer-ledger__dot" aria-hidden="true">
            {DOT}
          </span>
          <NavLink to="/privacy" className={linkClassName}>
            Privacy
          </NavLink>
          <span className="footer-ledger__dot" aria-hidden="true">
            {DOT}
          </span>
          <NavLink to="/terms" className={linkClassName}>
            Terms
          </NavLink>
        </div>
      </div>
    </footer>
  )
}

export default Footer
