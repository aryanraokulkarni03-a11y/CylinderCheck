import React from 'react'
import clsx from 'clsx'

const CALLOUT_CLASS = {
  clear: 'callout--clear',
  early: 'callout--early',
  active: 'callout--active',
  severe: 'callout--severe',
  accent: 'callout--accent',
}

export function Callout({
  as: Comp = 'div',
  tone = 'active', // clear | early | active | severe | accent
  edge = true,
  className,
  children,
  ...props
}) {
  const edgeClass = edge ? 'status-edge' : null
  const statusClass =
    edge && (tone === 'clear' || tone === 'early' || tone === 'active' || tone === 'severe')
      ? `status-edge--${tone}`
      : null

  return (
    <Comp
      className={clsx('callout', CALLOUT_CLASS[tone], edgeClass, statusClass, className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export default Callout

