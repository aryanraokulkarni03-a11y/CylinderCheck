// src/components/layout/Topbar.jsx
// Global header: mobile (brand + auth + theme) + desktop (brand + tabs + actions).

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CircleUserRound } from 'lucide-react'
import { FlameIcon } from '../shared/FlameIcon'
import { springs } from '../../lib/springs'
import { Callout } from '../ui/Callout'
import GoogleSignInButton from '../auth/GoogleSignInButton'

const ELLIPSIS = '\u2026'

export function Topbar({
  tabs = [],
  activeTab,
  onTabChange,
  user,
  authLoading,
  authError,
  logoClicks = 0,
  onLogoClick,
  onDismissAuthError,
  onGoogleSignIn,
  onAccountClick,
  userEmail = '',
}) {
  const shouldReduceMotion = useReducedMotion()
  const userInitial = userEmail?.[0]?.toUpperCase() || 'A'

  return (
    <header
      className="topbar-shell sticky top-0 z-[180]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[999]
                   focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-[var(--border)]
                   focus:bg-[var(--bg-raised)] focus:text-[var(--text-primary)]"
      >
        Skip to content
      </a>
      <div className="content-frame">
        <div className="topbar-float">
          <div
            className="topbar-float__inner"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
            }}
          >
            <button
              type="button"
              onClick={onLogoClick}
              className="topbar-brand select-none"
              title={logoClicks > 0 ? `${5 - logoClicks} more${ELLIPSIS}` : 'CylinderCheck'}
            >
              <span className="topbar-brand__mark">
                <FlameIcon size={22} />
              </span>
              <span className="type-brand">
                CylinderCheck
                <span
                  className="w-[6px] h-[6px] rounded-full bg-[var(--accent)] inline-block ml-[6px]"
                  aria-hidden="true"
                />
              </span>
            </button>

            {/* Desktop tabs */}
            <nav className="topbar-nav hidden md:flex" aria-label="Primary">
              {tabs.map((t) => {
                const active = t.id === activeTab
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTabChange?.(t.id)}
                    className={`topbar-tab type-nav ${active ? 'topbar-tab--active' : ''}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="topnav-pill"
                        className="topbar-tab__glow"
                        transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                      />
                    )}
                    <span className="relative z-[1]">{t.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="topbar-actions">
              {!authLoading && !user && (
                <GoogleSignInButton
                  onClick={() => onGoogleSignIn?.()}
                  compact={true}
                  className="min-h-[44px] px-3 sm:px-4 topbar-quiet-btn"
                >
                  <span className="hidden sm:inline">Sign in with Google</span>
                  <span className="sm:hidden">Google</span>
                </GoogleSignInButton>
              )}

              <button
                type="button"
                onClick={onAccountClick}
                className="btn-ghost topbar-account-btn topbar-quiet-btn"
                aria-label={user ? 'Open account and essentials' : 'Open account, sign-in, and essentials'}
                title={user ? (user.email || 'Account') : 'Account'}
              >
                {user ? (
                  <span className="topbar-account-btn__avatar" aria-hidden="true">
                    {userInitial}
                  </span>
                ) : (
                  <CircleUserRound size={18} aria-hidden="true" />
                )}
                <span className="topbar-account-btn__label">Account</span>
              </button>
            </div>
          </div>
        </div>
        {authError ? (
          <div className="topbar-floating-callout pb-3 pt-2" aria-live="polite">
            <Callout tone="active" className="py-3" edge={false}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="kicker mb-1">Sign-in status</div>
                  <p className="type-note text-[var(--text-primary)] m-0">{authError}</p>
                </div>
                {onDismissAuthError ? (
                  <button
                    type="button"
                    onClick={onDismissAuthError}
                    className="btn-ghost shrink-0 min-h-[40px] px-3"
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            </Callout>
          </div>
        ) : null}
      </div>
    </header>
  )
}

export default Topbar
