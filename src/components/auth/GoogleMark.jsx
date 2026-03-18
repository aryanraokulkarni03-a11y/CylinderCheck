import React from 'react'

export function GoogleMark({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7.1 0-.7-.1-1.4-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4.1H3.3v2.5C5 18.8 8.2 21 12 21z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 13c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V6.5H3.3C2.5 8 2 9.4 2 11s.5 3 1.3 4.5L6.5 13z"
      />
      <path
        fill="#4285F4"
        d="M12 4.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.8 1.9 14.6 1 12 1 8.2 1 5 3.2 3.3 6.5L6.5 9c.8-2.4 3-4.1 5.5-4.1z"
      />
    </svg>
  )
}

export default GoogleMark
