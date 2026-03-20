import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CircleUserRound,
  LifeBuoy,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Waypoints,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import { getTheme, setTheme } from '../../theme'

const ESSENTIAL_LINKS = [
  {
    to: '/support',
    kicker: 'Help',
    title: 'Support',
    note: 'Billing, corrections, commercial help, and account questions.',
    icon: LifeBuoy,
  },
  {
    to: '/privacy',
    kicker: 'Privacy',
    title: 'Privacy Policy',
    note: 'How CylinderCheck and Xisch.Co collect, use, and protect data.',
    icon: ShieldCheck,
  },
  {
    to: '/terms',
    kicker: 'Terms',
    title: 'Terms of Use',
    note: 'Rules, responsibilities, and paid-feature expectations.',
    icon: Waypoints,
  },
]

export function AccountPage({ user, authLoading, onGoogleSignIn, onSignOut }) {
  const [themeMode, setThemeMode] = useState(() => getTheme())

  const signedInLabel = useMemo(() => {
    if (authLoading) return 'Checking account'
    return user?.email || 'Not signed in'
  }, [authLoading, user])

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme)
    setThemeMode(nextTheme)
  }

  const isDarkMode = themeMode === 'dark'

  return (
    <div className="page-root account-page">
      <PageHeader
        markerShowStatus={false}
        markerStatus={user ? 'clear' : 'early'}
        markerLabel="Account"
        icon={CircleUserRound}
        title="Account"
        description="Manage sign-in, theme, support, and core legal pages in one place."
      />

      <div className="page-section page-grid-account account-grid">
        <Card variant="featured">
          <CardHeader
            kicker="Identity"
            title={user ? 'Signed in' : 'Sign in when needed'}
            meta={<span className="reading-meta">{signedInLabel}</span>}
          />
          <CardBody className="stack-copy">
            {user ? (
              <>
                <p className="type-reading-copy m-0">
                  You are currently signed in as <strong>{user.email}</strong>. Account-linked features like community
                  reports and paid alert flows will use this identity.
                </p>
                <div className="account-actions">
                  <button type="button" className="btn-ghost account-action account-action--danger" onClick={onSignOut}>
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="type-reading-copy m-0">
                  You can use CylinderCheck without signing in for core tracking, then sign in only when a workflow
                  needs identity, like submitting reports or managing account-linked services.
                </p>
                <div className="account-actions">
                  <GoogleSignInButton className="w-full justify-center" onClick={() => onGoogleSignIn?.('/account')} />
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card variant="raised">
          <CardHeader
            kicker="Appearance"
            title="Theme preference"
            meta={<span className="reading-meta">Light by default</span>}
          />
          <CardBody className="stack-copy">
            <div className="account-theme-toggle" role="group" aria-label="Theme preference">
              <div className="account-theme-toggle__copy">
                <p className="type-card-title mb-0">
                  {isDarkMode ? 'Dark' : 'Light'}
                </p>
                <p className="type-note account-theme-toggle__note mb-0">
                  {isDarkMode
                    ? 'Lower glare for night use.'
                    : 'Clearer for daylight and quick scanning.'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                aria-label="Toggle theme"
                className={`account-theme-toggle__switch${isDarkMode ? ' is-dark' : ''}`}
                onClick={() => handleThemeChange(isDarkMode ? 'light' : 'dark')}
              >
                <span className="account-theme-toggle__label">
                  <Sun size={15} />
                  <span>Light</span>
                </span>
                <span className="account-theme-toggle__label">
                  <Moon size={15} />
                  <span>Dark</span>
                </span>
                <span className="account-theme-toggle__thumb" aria-hidden="true" />
              </button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="page-section">
        <Card variant="raised">
          <CardHeader
            kicker="Essentials"
            title="Support, privacy, and legal"
            meta={<span className="reading-meta">Core product links</span>}
          />
          <CardBody>
            <div className="account-essentials">
              {ESSENTIAL_LINKS.map(({ to, kicker, title, note, icon: Icon }) => (
                <Link key={to} to={to} className="account-link-card">
                  <span className="account-link-card__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="account-link-card__copy">
                    <span className="kicker">{kicker}</span>
                    <span className="type-card-title">{title}</span>
                    <span className="type-note">{note}</span>
                  </span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default AccountPage
