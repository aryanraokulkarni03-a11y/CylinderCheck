// src/components/layout/Topbar.jsx
import { FlameIcon } from '../shared/FlameIcon'
import { ThemeToggle } from '../shared/ThemeToggle'
import { supabase } from '../../supabaseClient'

export function Topbar({ user, authLoading }) {
  return (
    <header
      className="md:hidden flex items-center gap-3
                 border-b border-[var(--border)]
                 sticky top-0 z-[100] px-4"
      style={{
        height: 'var(--topbar-height)',
        paddingTop: 'env(safe-area-inset-top)',
        backdropFilter: 'blur(28px) saturate(130%)',
        WebkitBackdropFilter: 'blur(28px) saturate(130%)',
        background: 'var(--glass-deep)',
      }}
    >
      <FlameIcon size={22} />
      <span className="font-display font-extrabold text-[18px]
                       tracking-[-0.02em] text-[var(--text-primary)] flex-1">
        CylinderCheck
      </span>

      {!authLoading && !user && (
        <button
          onClick={() => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
          })}
          className="text-[12px] text-[var(--text-muted)]
                     hover:text-[var(--accent)] transition-colors px-2 py-1"
        >
          Sign in
        </button>
      )}

      {!authLoading && user && (
        <div className="w-7 h-7 rounded-full flex-shrink-0
                        bg-[var(--accent-soft)] border border-[var(--accent)]
                        flex items-center justify-center
                        text-[12px] font-bold text-[var(--accent)]">
          {user.email?.[0]?.toUpperCase() || 'U'}
        </div>
      )}

      <ThemeToggle />
    </header>
  )
}

export default Topbar
