import React from 'react';

export default function EmptyState({ title, description, actionText, onAction, iconSlot }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] border border-[var(--border)] rounded-lg bg-[var(--bg-inset)] w-full">
      <div className="mb-6 opacity-80 text-[var(--text-muted)]">
        {iconSlot || (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60 text-current">
            <path d="M22 20C22 15 42 15 42 20V50C42 55 22 55 22 50V20Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M28 12C28 8 36 8 36 12V20H28V12Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 32C12 20 52 20 52 32C52 44 12 44 12 32Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2"/>
          </svg>
        )}
      </div>
      <h3 className="font-display text-[var(--fs-body-lg)] font-bold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="font-body text-[var(--fs-sm)] text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="text-[var(--fs-sm)] font-medium text-[var(--accent)] hover:text-[var(--accent-pop)] transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
