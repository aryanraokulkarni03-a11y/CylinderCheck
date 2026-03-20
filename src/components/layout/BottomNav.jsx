// src/components/layout/BottomNav.jsx
import { motion, useReducedMotion } from 'motion/react'
import { springs } from '../../lib/springs'

export function BottomNav({ tabs, activeTab, onTabChange }) {
  const shouldReduceMotion = useReducedMotion()
  const tapScale = shouldReduceMotion ? 0.98 : 0.94

  return (
    <nav
      className="bottomnav-shell md:hidden fixed bottom-0 left-0 right-0 z-[200]
                 border-t border-[var(--border)]"
      aria-label="Primary"
      style={{
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        paddingTop: '6px',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        background: 'var(--glass-deep)',
      }}
    >
      <div className="content-frame">
        <div className="bottomnav-track">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              whileTap={{ scale: tapScale }}
              transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
              className={`bottomnav-tab type-nav
                          transition-colors duration-150
                          ${activeTab === tab.id
                            ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'text-[var(--text-secondary)]'
                          }`}
            >
              <tab.icon
                className="bottomnav-tab__icon"
                size={18}
                strokeWidth={1.8}
                style={{
                  filter: activeTab === tab.id
                    ? 'drop-shadow(0 0 6px var(--accent-glow))'
                    : 'none'
                }}
              />
              <span className="bottomnav-tab__label kicker text-[inherit] leading-none">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
