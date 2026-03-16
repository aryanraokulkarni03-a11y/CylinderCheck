// src/components/shared/ThemeToggle.jsx
import { useState } from 'react'
import { motion } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme } from '../../theme.js'
import { springs } from '../../lib/springs'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark')

  return (
    <motion.button
      onClick={() => { toggleTheme(); setIsDark(p => !p) }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={springs.response}
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
