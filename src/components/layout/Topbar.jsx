// src/components/layout/Topbar.jsx
// Global header: mobile (brand + auth + theme) + desktop (brand + tabs + actions).

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FlameIcon } from '../shared/FlameIcon'
import { ThemeToggle } from '../shared/ThemeToggle'
import { supabase } from '../../supabaseClient'
import { HelpCircle, LogOut } from 'lucide-react'
import { springs } from '../../lib/springs'

const DOT = '\u00B7'
const ELLIPSIS = '\u2026'

export function Topbar({
  tabs = [],
  activeTab,
  onTabChange,
  user,
  authLoading,
  logoClicks = 0,
  onLogoClick,
  onSupportOpen,
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
      <div className="mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6 md:px-8">
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
            <span className="font-display font-extrabold text-[18px] tracking-[-0.02em] text-[var(--text-primary)]">
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
                  className={`relative px-3 py-2 rounded-md font-data text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
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
            {/* Desktop support */}
            <button
              type="button"
              onClick={onSupportOpen}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] transition-colors"
            >
              <HelpCircle size={16} />
              <span className="font-data text-[11px] uppercase tracking-[0.14em] font-semibold">
                Support
              </span>
            </button>

            {!authLoading && !user && (
              <button
                type="button"
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                  })
                }
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-inset)] hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] transition-colors"
              >
                <span className="font-data text-[11px] uppercase tracking-[0.14em] font-semibold">
                  Sign in
                </span>
                <span className="text-[var(--divider)]" aria-hidden="true">
                  {DOT}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Google</span>
              </button>
            )}

            {!authLoading && user && (
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 bg-[var(--accent-soft)] border border-[var(--accent)]
                             flex items-center justify-center text-[12px] font-bold text-[var(--accent)]"
                  aria-label="Signed in"
                  title={user.email || 'Signed in'}
                >
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--border)] bg-[var(--bg-inset)]
                             hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar

