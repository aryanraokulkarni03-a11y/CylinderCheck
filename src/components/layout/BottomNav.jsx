// src/components/layout/BottomNav.jsx
import { motion, useReducedMotion } from 'motion/react'
import { springs } from '../../lib/springs'

export function BottomNav({ tabs, activeTab, onTabChange }) {
  const shouldReduceMotion = useReducedMotion()
  const tapScale = shouldReduceMotion ? 0.98 : 0.94

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[200]
                 flex border-t border-[var(--border)]"
      style={{
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        paddingTop: '6px',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        background: 'var(--glass-deep)',
      }}
    >
      {tabs.map(tab => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          whileTap={{ scale: tapScale }}
          transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
          className={`flex-1 flex flex-col items-center gap-[3px]
                      px-[2px] py-[5px] relative min-h-[50px]
                      text-[var(--fs-xs)] font-medium tracking-[0.02em]
                      transition-colors duration-150
                      ${activeTab === tab.id
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-secondary)]'
                      }`}
        >
          {/* Top indicator pip */}
          {activeTab === tab.id && (
            <motion.span
              layoutId="nav-pip"
              className="absolute top-0 w-7 h-[3px] rounded-b-sm
                         bg-[var(--accent)]"
              transition={springs.smooth}
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
          {tab.label}
        </motion.button>
      ))}
    </nav>
  )
}

export default BottomNav
