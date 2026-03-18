import React from 'react'
import clsx from 'clsx'

const STATUS_CLASS = {
  clear: 'status-edge--clear',
  early: 'status-edge--early',
  active: 'status-edge--active',
  severe: 'status-edge--severe',
}

export function Card({
  as: Comp = 'div',
  variant = 'raised', // raised | inset | featured | dashed
  size = 'default', // default | compact
  status, // clear | early | active | severe
  edge = false, // status edge rail
  className,
  children,
  ...props
}) {
  const v =
    variant === 'featured'
      ? 'card card-featured'
      : variant === 'inset'
        ? 'card card--inset'
        : variant === 'dashed'
          ? 'card card--dashed'
          : 'card'

  const s = size === 'compact' ? 'card--compact' : null
  const edgeClass = edge ? 'status-edge' : null
  const statusClass = edge && status ? STATUS_CLASS[status] : null

  return (
    <Comp
      className={clsx(v, s, edgeClass, statusClass, className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export default Card

