// src/components/layout/BottomNav.jsx
import { motion, useReducedMotion } from 'motion/react'
import { springs } from '../../lib/springs'

export function BottomNav({ tabs, activeTab, onTabChange }) {
  const shouldReduceMotion = useReducedMotion()
  const tapScale = shouldReduceMotion ? 0.98 : 0.94

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[200]
                 border-t border-[var(--border)]"
      style={{
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        paddingTop: '6px',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        background: 'var(--glass-deep)',
      }}
    >
      <div className="content-frame">
        <div className="grid grid-cols-5 gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-inset)] p-1">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              whileTap={{ scale: tapScale }}
              transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
              className={`flex flex-col items-center justify-center gap-[4px]
                          px-[4px] py-[7px] relative min-h-[52px] rounded-[var(--radius-md)]
                          type-nav
                          transition-colors duration-150
                          ${activeTab === tab.id
                            ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'text-[var(--text-secondary)]'
                          }`}
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="nav-pip"
                  className="absolute top-1.5 h-[3px] w-6 rounded-full bg-[var(--accent)]"
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
                />
              )}

              <tab.icon
                size={18}
                strokeWidth={1.8}
                style={{
                  filter: activeTab === tab.id
                    ? 'drop-shadow(0 0 6px var(--accent-glow))'
                    : 'none'
                }}
              />
              <span className="kicker text-[inherit] leading-none">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
