import React from 'react'
import { SectionMarker } from '../shared/SectionMarker'

export function PageHeader({
  markerStatus = 'clear',
  markerLabel,
  markerSublabel,
  as = 'h1',
  icon: Icon,
  title,
  description,
  actions,
  className = '',
}) {
  const TitleTag = as

  return (
    <div className={`page-header ${className}`}>
      {markerLabel ? (
        <SectionMarker status={markerStatus} label={markerLabel} sublabel={markerSublabel} />
      ) : null}

      <div className="page-header__row">
        <div className="page-header__copy">
          <TitleTag className="page-header__title">
            {Icon ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Icon size={28} className="text-[var(--accent)]" aria-hidden="true" />
                <span>{title}</span>
              </span>
            ) : (
              title
            )}
          </TitleTag>
          {description ? <p className="page-header__desc">{description}</p> : null}
        </div>

        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

export default PageHeader

