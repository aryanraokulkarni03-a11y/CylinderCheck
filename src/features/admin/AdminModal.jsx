import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Loader2, Lock, X } from 'lucide-react'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import { springs } from '../../lib/springs'

export default function AdminModal({ isOpen, onClose, onUnlock, loading }) {
  const shouldReduceMotion = useReducedMotion()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setError(false)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) return

    const success = await onUnlock(password)
    if (!success) {
      setError(true)
      setTimeout(() => setError(false), 2000)
      setPassword('')
      return
    }

    setPassword('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center isolate p-4">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close admin modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
            className="relative w-full max-w-sm overflow-hidden
                       rounded-[var(--radius-xl)]
                       border border-[var(--border)]
                       bg-[var(--bg-raised)]
                       shadow-[0_20px_50px_var(--shadow-modal)]"
          >
            {/* Accent strip */}
            <div
              className="absolute top-0 left-0 w-full h-1"
              style={{
                background:
                  'linear-gradient(to right, var(--accent), var(--status-early), var(--accent))',
              }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-11 h-11 rounded-full
                         flex items-center justify-center
                         text-[var(--text-muted)]
                         hover:text-[var(--text-primary)]
                         hover:bg-[var(--bg-inset)]
                         transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center pt-8 pb-6 px-6">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${
                  error
                    ? 'bg-[var(--status-severe-soft)] text-[var(--status-severe)] border border-[var(--status-severe-border)]'
                    : 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-glow)] shadow-[0_0_22px_var(--accent-glow)]'
                }`}
              >
                <Lock size={24} className={error ? 'motion-safe:animate-pulse' : ''} />
              </div>

              <h2 className="text-[var(--fs-h4)] font-bold font-display text-[var(--text-primary)] mb-2">
                Restricted Area
              </h2>
              <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] text-center max-w-[260px] mb-8 font-medium leading-relaxed">
                Enter clearance code to access system metrics.
              </p>

              <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="admin-password"
                    className="label-text text-[var(--text-muted)] mb-2 block"
                  >
                    Clearance code
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(false)
                    }}
                    placeholder="Password"
                    autoFocus
                    aria-invalid={error || undefined}
                    className={`input rounded-[var(--radius-sm)] tracking-[0.2em] text-center ${
                      error ? 'border-[var(--status-severe)]' : ''
                    }`}
                  />
                  {error && (
                    <p className="overline text-[var(--status-severe)] text-center mt-2">
                      Access denied
                    </p>
                  )}
                </div>

                <LiquidGlassBtn
                  type="submit"
                  className="w-full justify-center"
                  disabled={!password || loading || error}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="motion-safe:animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    'Authenticate'
                  )}
                </LiquidGlassBtn>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
