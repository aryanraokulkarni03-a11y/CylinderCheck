import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { springs, timing } from '../../lib/springs'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromDateValue(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim())
  if (!match) return null

  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isFinite(date.getTime()) ? date : null
}

function formatFieldValue(value) {
  const date = fromDateValue(value)
  if (!date) return 'Choose a date'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isSameDay(a, b) {
  return a && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function monthLabel(date) {
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function buildCalendarDays(monthDate) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const days = []

  for (let i = 0; i < start.getDay(); i += 1) {
    days.push(null)
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day))
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
}

export default function BookingDatePicker({ id, value, onChange }) {
  const shouldReduceMotion = useReducedMotion()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const dayRefs = useRef(new Map())
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateValue(value) || new Date())
  const [focusedDate, setFocusedDate] = useState(() => fromDateValue(value) || new Date())

  const selectedDate = useMemo(() => fromDateValue(value), [value])
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
      setFocusedDate(selectedDate)
    }
  }, [selectedDate])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const target = focusedDate || selectedDate || today
    const key = toDateValue(target)
    const focusTarget = dayRefs.current.get(key)

    if (focusTarget) {
      requestAnimationFrame(() => focusTarget.focus())
    }
  }, [isOpen, focusedDate, selectedDate, today, visibleMonth])

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])

  function selectDate(date) {
    onChange?.(toDateValue(date))
    setIsOpen(false)
  }

  function handleQuickPick(kind) {
    if (kind === 'clear') {
      onChange?.('')
      setIsOpen(false)
      return
    }

    const base = new Date(today)
    if (kind === 'yesterday') {
      base.setDate(base.getDate() - 1)
    }

    selectDate(base)
  }

  function moveFocusByDays(delta) {
    const current = focusedDate || selectedDate || today
    const next = new Date(current)
    next.setDate(next.getDate() + delta)
    if (next.getTime() > today.getTime()) return
    setFocusedDate(next)
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1))
  }

  function handleDayKeyDown(event, date) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocusByDays(-1)
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocusByDays(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocusByDays(-7)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocusByDays(7)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      const next = new Date(date)
      next.setDate(1)
      setFocusedDate(next)
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1))
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      if (next.getTime() > today.getTime()) {
        setFocusedDate(today)
        setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
        return
      }
      setFocusedDate(next)
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectDate(date)
    }
  }

  return (
    <div ref={rootRef} className="booking-date-picker">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`booking-date-trigger ${value ? 'booking-date-trigger--filled' : ''}`}
      >
        <span className="booking-date-trigger__copy">
          <span className="booking-date-trigger__eyebrow">Last booking date</span>
          <span className="booking-date-trigger__value">
            {formatFieldValue(value)}
          </span>
        </span>
        <span className="booking-date-trigger__icon" aria-hidden="true">
          <CalendarDays size={18} />
        </span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close booking date picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0.01 } : { duration: timing.base }}
              className="booking-date-picker__backdrop"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              ref={panelRef}
              id={`${id}-panel`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-title`}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={shouldReduceMotion ? { duration: 0.01 } : springs.sheet}
              className="booking-date-panel"
            >
              <div className="booking-date-panel__handle" aria-hidden="true" />

              <div className="booking-date-panel__header">
                <div>
                  <div className="kicker text-[var(--text-secondary)]">Last booking date</div>
                  <h3 id={`${id}-title`} className="type-card-title m-0 mt-1">Choose your booking window anchor</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="icon-btn"
                  aria-label="Close calendar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="booking-date-panel__quick-actions">
                <button type="button" className="pill" onClick={() => handleQuickPick('today')}>Today</button>
                <button type="button" className="pill" onClick={() => handleQuickPick('yesterday')}>Yesterday</button>
                <button type="button" className="pill" onClick={() => handleQuickPick('clear')}>Clear</button>
              </div>

              <div className="booking-date-panel__month-row">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Previous month"
                  onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="type-card-title text-center">{monthLabel(visibleMonth)}</div>

                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Next month"
                  onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="booking-date-grid">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="booking-date-grid__weekday">
                    {day}
                  </div>
                ))}

                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`blank-${index}`} className="booking-date-grid__blank" aria-hidden="true" />
                  }

                  const isSelected = isSameDay(date, selectedDate)
                  const isToday = isSameDay(date, today)
                  const isFuture = date.getTime() > today.getTime()
                  const isFocused = isSameDay(date, focusedDate)
                  const dateKey = toDateValue(date)

                  return (
                    <button
                      key={date.toISOString()}
                      ref={(node) => {
                        if (node) {
                          dayRefs.current.set(dateKey, node)
                        } else {
                          dayRefs.current.delete(dateKey)
                        }
                      }}
                      type="button"
                      disabled={isFuture}
                      aria-pressed={isSelected}
                      tabIndex={isFocused ? 0 : -1}
                      onFocus={() => setFocusedDate(date)}
                      onKeyDown={(event) => handleDayKeyDown(event, date)}
                      onClick={() => selectDate(date)}
                      className={[
                        'booking-date-grid__day',
                        isSelected ? 'booking-date-grid__day--selected' : '',
                        isToday ? 'booking-date-grid__day--today' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <span>{date.getDate()}</span>
                    </button>
                  )
                })}
              </div>

              <p className="type-note m-0">
                We use this date to estimate your next booking window. Future dates stay locked to keep the forecast honest.
              </p>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
