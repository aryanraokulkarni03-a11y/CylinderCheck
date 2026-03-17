import React, { useId } from 'react'

function toDomSafeId(id) {
  // React's useId() can include ":" which is valid in HTML, but annoying to read/debug.
  return String(id).replace(/[:]/g, '')
}

export function Field({
  id,
  label,
  meta,
  error,
  required = false,
  className = '',
  children,
}) {
  const rid = useId()
  const fallbackId = `field-${toDomSafeId(rid)}`
  const controlId = id || fallbackId

  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = errorId || undefined

  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })
    : children

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {(label || meta) ? (
        <div className="field__top">
          {label ? (
            <label className="field__label" htmlFor={controlId}>
              {label}{required ? <span className="text-[var(--text-muted)]"> *</span> : null}
            </label>
          ) : <span />}
          {meta ? <div className="field__meta">{meta}</div> : null}
        </div>
      ) : null}

      {child}

      {error ? (
        <div className="field__error" id={errorId}>
          {error}
        </div>
      ) : null}
    </div>
  )
}

export default Field

