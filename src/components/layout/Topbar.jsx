// src/components/layout/Topbar.jsx
// Global header: mobile (brand + auth + theme) + desktop (brand + tabs + actions).

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FlameIcon } from '../shared/FlameIcon'
import { ThemeToggle } from '../shared/ThemeToggle'
import { supabase } from '../../supabaseClient'
import { LogIn, LogOut } from 'lucide-react'
import { springs } from '../../lib/springs'
import { Callout } from '../ui/Callout'

const DOT = '\u00B7'
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
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <header
      className="sticky top-0 z-[180] border-b border-[var(--border)]"
      style={{
        backdropFilter: 'blur(28px) saturate(140%)',
        WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        background: 'var(--glass-deep)',
      }}
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
        <div
          className="flex items-center gap-3"
          style={{
            height: 'var(--topbar-height)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-3 select-none"
            title={logoClicks > 0 ? `${5 - logoClicks} more${ELLIPSIS}` : 'CylinderCheck'}
          >
            <FlameIcon size={22} />
            <span className="font-display font-bold text-[var(--fs-body-lg)] tracking-[-0.02em] text-[var(--text-primary)]">
              CylinderCheck
              <span
                className="w-[6px] h-[6px] rounded-full bg-[var(--accent)] inline-block ml-[6px]"
                aria-hidden="true"
              />
            </span>
          </button>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {tabs.map((t) => {
              const active = t.id === activeTab
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange?.(t.id)}
                  className={`relative px-3 py-2 rounded-md font-medium transition-colors ${
                    active
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="topnav-underline"
                      className="absolute left-2 right-2 -bottom-[1px] h-[2px] rounded-full bg-[var(--accent)]"
                      transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                    />
                  )}
                  {t.label}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!authLoading && !user && (
              <button
                type="button"
                onClick={() => onGoogleSignIn?.('/track')}
                className="btn-ghost"
                aria-label="Sign in with Google"
                title="Sign in with Google"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline font-medium">Sign in</span>
                <span className="hidden sm:inline text-[var(--divider)]" aria-hidden="true">
                  {DOT}
                </span>
                <span className="hidden sm:inline text-[var(--text-muted)]">Google</span>
              </button>
            )}

            {!authLoading && user && (
              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex w-8 h-8 rounded-full flex-shrink-0 bg-[var(--accent-soft)] border border-[var(--accent)]
                             items-center justify-center text-[var(--fs-xs)] font-medium text-[var(--accent)]"
                  aria-label="Signed in"
                  title={user.email || 'Signed in'}
                >
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="btn-ghost w-11 px-0"
                  aria-label="Sign out"
                  title={user.email ? `Sign out (${user.email})` : 'Sign out'}
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
        {authError ? (
          <div className="pb-3" aria-live="polite">
            <Callout tone="active" className="py-3" edge={false}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="kicker mb-1">Sign-in status</div>
                  <p className="text-[var(--fs-xs)] text-[var(--text-primary)] m-0">{authError}</p>
                </div>
                {onDismissAuthError ? (
                  <button
                    type="button"
                    onClick={onDismissAuthError}
                    className="btn-ghost shrink-0 min-h-[40px] px-3 text-[var(--fs-xs)]"
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
