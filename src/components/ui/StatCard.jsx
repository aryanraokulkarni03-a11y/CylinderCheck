import React from 'react'
import clsx from 'clsx'
import { Card } from './Card'

export function StatCard({
  value,
  label,
  status,
  className,
  ...props
}) {
  return (
    <Card
      variant="raised"
      size="compact"
      edge={!!status}
      status={status}
      className={clsx('stat-card', className)}
      {...props}
    >
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </Card>
  )
}

export default StatCard

