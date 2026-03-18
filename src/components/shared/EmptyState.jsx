import React from 'react'
import { Card } from '../ui/Card'
import { CardBody, CardFooter } from '../ui/CardParts'

export default function EmptyState({ title, description, actionText, onAction, iconSlot }) {
  return (
    <Card
      variant="inset"
      className="card--dashed card--spacious min-h-[300px] w-full"
    >
      <div className="text-center">
        <div className="kicker mb-2">Awaiting signal</div>
        <h3 className="type-empty-title mb-0">
          {title}
        </h3>
      </div>
      <CardBody className="flex flex-col items-center justify-center text-center pt-6">
        <div className="mb-6 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[var(--divider)] bg-[var(--bg-raised)] text-[var(--text-muted)]">
          {iconSlot || (
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60 text-current">
              <path d="M22 20C22 15 42 15 42 20V50C42 55 22 55 22 50V20Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M28 12C28 8 36 8 36 12V20H28V12Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 32C12 20 52 20 52 32C52 44 12 44 12 32Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2"/>
            </svg>
          )}
        </div>
        <p className="type-empty-copy max-w-sm mx-auto mb-0">
          {description}
        </p>
      </CardBody>
      {actionText && onAction && (
        <CardFooter className="justify-center">
          <button
            onClick={onAction}
            className="btn-ghost"
          >
            {actionText}
          </button>
        </CardFooter>
      )}
    </Card>
  )
}
