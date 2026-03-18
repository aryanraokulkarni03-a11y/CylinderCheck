import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const SIGN_IN_EMAIL_FLAG = 'cc-pending-first-sign-in-email'

function redirectAfterAuth(target, navigate) {
  try {
    window.location.replace(target)
    return
  } catch {
    navigate(target, { replace: true })
  }
}

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

export function AuthCallbackPage({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const hasCompletedRef = useRef(false)

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
      if (hasCompletedRef.current) return

      const authError = readAuthError(location)
      if (authError) {
        hasCompletedRef.current = true
        setError(authError)
        return
      }

      let session = null

      if (authCode) {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)

        if (cancelled) return

        if (exchangeError) {
          hasCompletedRef.current = true
          setError('We could not complete sign-in. Please try again.')
          return
        }

        session = exchangeData.session
      }

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (cancelled) return

      if (sessionError && !user) {
        hasCompletedRef.current = true
        setError('We could not complete sign-in. Please try again.')
        return
      }

      if (!session) {
        session = data.session ?? null
      }

      const activeUser = session?.user ?? user ?? null

      if (!activeUser) {
        return
      }

      if (session?.access_token) {
        try {
          localStorage.setItem(SIGN_IN_EMAIL_FLAG, '1')
        } catch {
          // Ignore storage failures in private mode.
        }
      }

      hasCompletedRef.current = true
      const fallbackNext = getStoredNextPath()
      const target = requestedNext || (isSafeNextPath(fallbackNext) ? fallbackNext : null) || '/track'
      redirectAfterAuth(target, navigate)
    }

    finalizeAuth()
    return () => {
      cancelled = true
    }
  }, [authCode, location, navigate, requestedNext, user])

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
