import React from 'react'
import { SectionMarker } from '../shared/SectionMarker'

export function PageHeader({
  markerStatus = 'clear',
  markerLabel,
  markerSublabel,
  markerShowStatus = true,
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
        <SectionMarker
          status={markerStatus}
          label={markerLabel}
          sublabel={markerSublabel}
          showStatus={markerShowStatus}
        />
      ) : null}

      <div className="page-header__row">
        <div className="page-header__copy">
          <TitleTag className="page-header__title type-page-title">
            {Icon ? (
              <span className="page-header__title-row">
                <Icon size={28} className="text-[var(--accent)]" aria-hidden="true" />
                <span>{title}</span>
              </span>
            ) : (
              title
            )}
          </TitleTag>
          {description ? <p className="page-header__desc type-page-desc">{description}</p> : null}
        </div>

        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

export default PageHeader
