// src/components/layout/Sidebar.jsx
import { motion } from 'motion/react'
import { FlameIcon } from '../shared/FlameIcon'
import { ThemeToggle } from '../shared/ThemeToggle'
import { SectionMarker } from '../shared/SectionMarker'
import { supabase } from '../../supabaseClient'
import { HelpCircle } from 'lucide-react'

export function Sidebar({ tabs, activeTab, onTabChange,
                           user, authLoading, logoClicks,
                           onLogoClick, onSupportOpen }) {
  return (
    <aside className="fixed top-0 left-0 bottom-0 z-[200]
                      flex flex-col
                      bg-[var(--bg-raised)]
                      border-r border-[var(--border)]"
           style={{ width: 'var(--sidebar-width)' }}>

      {/* Logo */}
      <div
        onClick={onLogoClick}
        title={logoClicks > 0 ? `${5 - logoClicks} more…` : ''}
        className="flex items-center gap-3 px-5 py-5
                   border-b border-[var(--border)] cursor-default select-none"
      >
        <FlameIcon size={26} />
        <span className="font-display font-extrabold text-[20px]
                         tracking-[-0.02em] text-[var(--text-primary)]
                         flex items-baseline gap-[2px]">
          CylinderCheck
          <span className="w-[7px] h-[7px] rounded-full
                           bg-[var(--accent)] inline-block
                           flex-shrink-0 ml-[2px]" />
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 flex flex-col gap-1 flex-1 overflow-y-auto">
        <span className="text-[10px] font-bold tracking-[0.18em]
                         uppercase text-[var(--text-muted)]
                         px-3 mb-2 block">
          Main
        </span>
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md
                        text-[14px] font-medium w-full text-left
                        transition-colors duration-150
                        ${activeTab === tab.id
                          ? 'bg-[var(--bg-inset)] text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
                        }`}
          >
            <tab.icon
              size={18}
              strokeWidth={1.8}
              style={{ color: activeTab === tab.id
                ? 'var(--accent)' : 'currentColor' }}
            />
            {tab.label}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[var(--border)]
                      flex flex-col gap-3">
        <button
          onClick={onSupportOpen}
          className="flex items-center gap-2 text-[12px]
                     text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                     transition-colors duration-150 w-full text-left"
        >
          <HelpCircle size={13} />
          Support & FAQ
        </button>

        {/* Auth */}
        {!authLoading && (
          user ? (
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded-full flex-shrink-0
                              bg-[var(--accent-soft)] border border-[var(--accent)]
                              flex items-center justify-center
                              text-[11px] font-bold text-[var(--accent)]">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]
                               flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-[11px] text-[var(--text-muted)]
                           hover:text-[var(--status-active)]
                           transition-colors duration-150"
              >
                Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
              })}
              className="text-[12px] text-[var(--text-muted)]
                         hover:text-[var(--accent)] transition-colors
                         duration-150 text-left"
            >
              Sign in with Google
            </button>
          )
        )}

        <ThemeToggle />

        <p className="text-[10px] text-[var(--text-muted)]
                      leading-[1.6] mt-1">
          Not affiliated with IndianOil,<br />
          HP Gas, or Bharat Gas.<br />
          Data is community-sourced.<br /><br />
          © 2026 CylinderCheck 🇮🇳
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
