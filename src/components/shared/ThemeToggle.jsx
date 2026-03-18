// src/components/shared/ThemeToggle.jsx
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme } from '../../theme.js'
import { springs } from '../../lib/springs'
import { useHoverCapable } from '../../lib/useHoverCapable'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark')
  const shouldReduceMotion = useReducedMotion()
  const canHover = useHoverCapable()

  return (
    <motion.button
      onClick={() => { toggleTheme(); setIsDark(p => !p) }}
      whileHover={(!shouldReduceMotion && canHover) ? { scale: 1.08 } : undefined}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="btn-ghost w-11 px-0 flex-shrink-0 rounded-pill"
    >
      {isDark
        ? <Sun size={18} strokeWidth={1.8} />
        : <Moon size={18} strokeWidth={1.8} />
      }
    </motion.button>
  )
}
