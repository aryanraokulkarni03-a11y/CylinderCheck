// src/components/shared/KalamkariDivider.jsx
// Replaces all standard <hr> elements

export function KalamkariDivider({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 my-5 ${className}`}>
      {/* Small vine motif — left end */}
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path
          d="M1 5 C1 3 3 1 5 1 C7 1 8 3 8 5 C8 7 7 9 5 9 C3 9 1 7 1 5Z"
          stroke="var(--border)" strokeWidth="0.8" fill="none"
        />
        <path
          d="M8 5 L15 5"
          stroke="var(--divider)" strokeWidth="0.8"
        />
      </svg>
      {/* Line */}
      <div className="flex-1 h-px bg-[var(--divider)]" />
    </div>
  )
}

export default KalamkariDivider
