import React from 'react'
import clsx from 'clsx'
import GoogleMark from './GoogleMark'

export function GoogleSignInButton({
  onClick,
  disabled = false,
  className = '',
  compact = false,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'btn-ghost',
        'google-signin-btn',
        compact ? 'google-signin-btn--compact' : 'google-signin-btn--full',
        className,
      )}
      aria-label="Sign in with Google"
      title="Sign in with Google"
    >
      <GoogleMark size={18} />
      <span>{children || 'Sign in with Google'}</span>
    </button>
  )
}

export default GoogleSignInButton
