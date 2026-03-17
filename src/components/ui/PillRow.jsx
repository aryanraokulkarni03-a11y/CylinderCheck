import React from 'react'

export function PillRow({
  items = [],
  value,
  onChange,
  allowDeselect = false,
  ariaLabel,
  className = '',
}) {
  return (
    <div className={`pill-row ${className}`} role="group" aria-label={ariaLabel}>
      {items.map((it) => {
        const pressed = it.value === value
        return (
          <button
            key={String(it.value)}
            type="button"
            className="pill"
            aria-pressed={pressed}
            disabled={!!it.disabled}
            onClick={() => {
              if (!onChange) return
              if (allowDeselect && pressed) onChange(null)
              else onChange(it.value)
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

export default PillRow

