import React from 'react'
import clsx from 'clsx'

const STATUS_CLASS = {
  clear: 'status-edge--clear',
  early: 'status-edge--early',
  active: 'status-edge--active',
  severe: 'status-edge--severe',
}

export function ListRow({
  as: Comp = 'div',
  status,
  interactive = false,
  title,
  meta,
  badges,
  actions,
  children,
  className,
  ...props
}) {
  const edgeClass = status ? 'status-edge' : null
  const statusClass = status ? STATUS_CLASS[status] : null

  return (
    <Comp
      className={clsx(
        'list-row',
        interactive && 'row--interactive',
        edgeClass,
        statusClass,
        className,
      )}
      {...props}
    >
      <div className="list-row__main">
        {(badges || meta) ? (
          <div className="list-row__top">
            {badges ? <div className="list-row__badges">{badges}</div> : <span />}
            {meta ? <div className="list-row__meta">{meta}</div> : null}
          </div>
        ) : null}

        {title ? <div className="list-row__title">{title}</div> : null}
        {children ? <div className="list-row__body">{children}</div> : null}
      </div>

      {actions ? <div className="list-row__actions">{actions}</div> : null}
    </Comp>
  )
}

export default ListRow

