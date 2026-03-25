import React from 'react'
import clsx from 'clsx'

export function CardHeader({
  kicker,
  kickerCaps = false,
  title,
  titleAs: TitleTag = 'h3',
  meta,
  actions,
  className,
  children,
  ...props
}) {
  const hasMetaContent = Boolean(kicker || meta)
  const hasTopRail = Boolean(hasMetaContent || actions)
  const actionsOnly = Boolean(!hasMetaContent && actions)

  return (
    <div
      className={clsx('card-header', actionsOnly && 'card-header--actions-only', className)}
      {...props}
    >
      {hasTopRail ? (
        <div className={clsx('card-header__top', actionsOnly && 'card-header__top--actions-only')}>
          {hasMetaContent ? (
            <div className="card-header__meta">
              {kicker ? (
                <div className={clsx('kicker', kickerCaps && 'kicker--caps')}>
                  {kicker}
                </div>
              ) : null}
              {meta ? <div className="card-header__submeta">{meta}</div> : null}
            </div>
          ) : (
            <div />
          )}
          {actions ? <div className="card-header__actions">{actions}</div> : null}
        </div>
      ) : null}

      {title ? (
        <TitleTag className="card-header__title type-card-title">
          {title}
        </TitleTag>
      ) : null}

      {children}
    </div>
  )
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={clsx('card-body', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={clsx('card-footer', className)} {...props}>
      {children}
    </div>
  )
}

export default CardHeader
