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
    <div className="mb-6" role="group" aria-label="LPG company">
      {!compact && (
        <div className="overline text-[var(--text-primary)] mb-3 flex items-center justify-between">
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
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-[var(--radius-sm)] border transition-colors ${
              value === co.id
                ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] ring-1 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-inset)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
            }`}
            onClick={() => onChange(value === co.id ? null : co.id)}
            aria-pressed={value === co.id}
          >
            <span className="text-lg" aria-hidden="true">
              {co.emoji}
            </span>
            <span className="text-[12px] font-medium tracking-wide">{compact ? co.short : co.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
