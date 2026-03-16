// src/components/shared/FlameIcon.jsx
// Redesigned with Kalamkari peacock feather curve informing the flame shape

export function FlameIcon({ size = 28 }) {
  return (
    <svg width={size} height={size * 1.3}
      viewBox="0 0 28 36" fill="none" className="flex-shrink-0">
      {/* Outer flame — Kalamkari-informed organic curve */}
      <path
        d="M14 2C14 2 22 10 22 18C22 24 18.5 27 14 27
           C9.5 27 6 24 6 18C6 10 14 2 14 2Z"
        fill="var(--accent)"
        opacity="0.9"
      />
      {/* Inner flame — brighter core */}
      <path
        d="M14 10C14 10 18 15 18 19C18 22 16.5 23.5 14 23.5
           C11.5 23.5 10 22 10 19C10 15 14 10 14 10Z"
        fill="var(--accent-pop)"
      />
      {/* Cylinder body */}
      <rect x="9" y="27" width="10" height="6" rx="1"
        fill="var(--text-muted)" opacity="0.6" />
      {/* Cylinder base */}
      <ellipse cx="14" cy="33" rx="7" ry="2"
        fill="var(--border)" />
    </svg>
  )
}

export default FlameIcon
