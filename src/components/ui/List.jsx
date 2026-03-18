import React from 'react'
import clsx from 'clsx'
import { Card } from './Card'

export function List({
  as: Comp = 'div',
  variant = 'raised',
  inset = false,
  className,
  children,
  ...props
}) {
  return (
    <Card
      as={Comp}
      variant={inset ? 'inset' : variant}
      className={clsx('card--flush list', className)}
      {...props}
    >
      {children}
    </Card>
  )
}

export default List

