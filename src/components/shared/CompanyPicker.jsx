// src/components/shared/CompanyPicker.jsx

import React from 'react'
import { COMPANY_EMOJI, COMPANY_LABELS } from '../../lib/utils'

export const COMPANY_PICKER_OPTS = [
  {
    id: 'IndianOil',
    label: COMPANY_LABELS?.IndianOil || 'IndianOil',
    short: 'Indane',
    emoji: COMPANY_EMOJI?.IndianOil || '\u{1F535}', // blue circle
  },
  {
    id: 'HP Gas',
    label: COMPANY_LABELS?.['HP Gas'] || 'HP Gas',
    short: 'HP Gas',
    emoji: COMPANY_EMOJI?.['HP Gas'] || '\u{1F7E1}', // yellow circle
  },
  {
    id: 'Bharat Gas',
    label: COMPANY_LABELS?.['Bharat Gas'] || 'Bharat Gas',
    short: 'Bharatgas',
    emoji: COMPANY_EMOJI?.['Bharat Gas'] || '\u{1F7E2}', // green circle
  },
]

export default function CompanyPicker({ value, onChange, compact }) {
  return (
      <div role="group" aria-label="LPG company">
        {!compact && (
          <div className="kicker text-[var(--text-primary)] mb-3 flex items-center justify-between">
            Your gas company
            <span className="caption text-[var(--text-muted)] tracking-normal normal-case">
              (optional)
            </span>
          </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {COMPANY_PICKER_OPTS.map((co) => (
          <button
            key={co.id}
            type="button"
            className="chip"
            onClick={() => onChange(value === co.id ? null : co.id)}
            aria-pressed={value === co.id}
          >
            <span className="text-[var(--fs-body-lg)]" aria-hidden="true">
              {co.emoji}
            </span>
            <span className="text-[var(--fs-xs)] font-medium tracking-wide">
              {compact ? co.short : co.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
