import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const NOTIFY_TIMEOUT_MS = 4000

function isSafeNextPath(nextPath) {
  return typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
}

function getStoredNextPath() {
  try {
    const stored = localStorage.getItem('cc-post-auth-path')
    if (!stored) return null
    localStorage.removeItem('cc-post-auth-path')
    return stored
  } catch {
    return null
  }
}

function readAuthError(location) {
  const queryParams = new URLSearchParams(location.search)
  const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''))
  return (
    hashParams.get('error_description') ||
    hashParams.get('error') ||
    queryParams.get('error_description') ||
    queryParams.get('error') ||
    ''
  )
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const hasFinalizedRef = useRef(false)

  const requestedNext = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const next = params.get('next')
    return isSafeNextPath(next) ? next : null
  }, [location.search])

  const authCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('code') || ''
  }, [location.search])

  useEffect(() => {
    let cancelled = false

    async function finalizeAuth() {
      if (hasFinalizedRef.current) return
      hasFinalizedRef.current = true

      const authError = readAuthError(location)
      if (authError) {
        setError(authError)
        return
      }

      if (authCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)

        if (cancelled) return

        if (exchangeError) {
          setError('We could not complete sign-in. Please try again.')
          return
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (cancelled) return

      if (sessionError) {
        setError('We could not complete sign-in. Please try again.')
        return
      }

      if (!data.session?.user) {
        setError('No active session was found after sign-in. Please try again.')
        return
      }

      if (authCode && data.session.access_token) {
        try {
          const notifyUrl = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1/notify-sign-in`
          const controller = new AbortController()
          const timeout = window.setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS)

          try {
            await fetch(notifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ source: 'google-oauth' }),
              signal: controller.signal,
            }).catch(() => undefined)
          } finally {
            window.clearTimeout(timeout)
          }
        } catch {
          // Email is best-effort. Auth flow should not fail if the notification provider is unavailable.
        }
      }

      const fallbackNext = getStoredNextPath()
      const target = requestedNext || (isSafeNextPath(fallbackNext) ? fallbackNext : null) || '/track'
      navigate(target, { replace: true })
    }

    finalizeAuth()
    return () => {
      cancelled = true
    }
  }, [authCode, location, navigate, requestedNext])

  return (
    <div className="reading-page">
      <Card variant="raised" className="max-w-[640px] mx-auto">
        <CardHeader
          kicker="Authentication"
          title={error ? 'Sign-in needs another try' : 'Signing you in'}
          meta={<span className="reading-meta">CylinderCheck</span>}
        />
        <CardBody className="stack-copy">
          {error ? (
            <>
              <p className="type-card-copy m-0">{error}</p>
              <p className="type-note m-0">
                Return to Track and try signing in again if the problem persists.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 type-card-copy text-[var(--text-primary)]">
                <Loader2 size={18} className="motion-safe:animate-spin" />
                Restoring your session and returning you to the page you left.
              </div>
              <p className="type-note m-0">
                This should only take a moment.
              </p>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

export default AuthCallbackPage
