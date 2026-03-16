import React from 'react';

export const COMPANY_PICKER_OPTS = [
  { id: "IndianOil", label: "IndianOil", short: "IOC",  emoji: "🔵" },
  { id: "HP Gas",    label: "HP Gas",    short: "HP",   emoji: "🟡" },
  { id: "Bharat Gas",label: "Bharat Gas",short: "BG",   emoji: "🟢" },
];

export default function CompanyPicker({ value, onChange, compact }) {
  return (
    <div className={`mb-6 ${compact ? '' : ''}`} role="group" aria-label="LPG company">
      {!compact && (
        <div className="text-[12px] font-bold text-[var(--text-primary)] uppercase tracking-widest font-data mb-3 flex items-center justify-between">
          Your Gas Company 
          <span className="text-[var(--text-muted)] text-[10px] tracking-normal normal-case font-body font-normal">(optional)</span>
        </div>
      )}
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3'}`}>
        {COMPANY_PICKER_OPTS.map(co => (
          <button
            key={co.id}
            type="button"
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-[var(--radius-sm)] border transition-all ${
              value === co.id 
                ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] shadow-[var(--neu-pressed)]" 
                : "bg-[var(--bg-inset)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            }`}
            onClick={() => onChange(value === co.id ? null : co.id)}
            aria-pressed={value === co.id}
          >
            <span className="text-lg">{co.emoji}</span>
            <span className="text-[12px] font-bold tracking-wide">{compact ? co.short : co.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
