// src/components/shared/ThemeToggle.jsx
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme } from '../../theme.js'
import { springs } from '../../lib/springs'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark')
  const shouldReduceMotion = useReducedMotion()
  const isHoverDevice = typeof window !== 'undefined'
    ? window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches
    : false

  return (
    <motion.button
      onClick={() => { toggleTheme(); setIsDark(p => !p) }}
      whileHover={(!shouldReduceMotion && isHoverDevice) ? { scale: 1.08 } : undefined}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-9 h-9 rounded-pill
                 bg-[var(--bg-inset)] border border-[var(--border)]
                 text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                 transition-colors duration-150 flex-shrink-0"
    >
      {isDark
        ? <Sun size={15} strokeWidth={1.8} />
        : <Moon size={15} strokeWidth={1.8} />
      }
    </motion.button>
  )
}
