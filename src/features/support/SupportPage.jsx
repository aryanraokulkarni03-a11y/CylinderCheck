import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, LifeBuoy, Mail, Receipt, ShieldCheck, Store, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const CONTACT_EMAIL = 'xisch.co@gmail.com'
const EFFECTIVE_DATE = 'March 18, 2026'
const GMAIL_COMPOSE_URL = 'https://mail.google.com/mail/?view=cm&fs=1'

function buildMailto(subject, body) {
  const params = new URLSearchParams({
    subject,
    body,
  })

  return `mailto:${CONTACT_EMAIL}?${params.toString()}`
}

function buildGmailCompose(subject, body) {
  const params = new URLSearchParams({
    to: CONTACT_EMAIL,
    su: subject,
    body,
  })

  return `${GMAIL_COMPOSE_URL}&${params.toString()}`
}

const SUPPORT_STREAMS = [
  {
    icon: Receipt,
    kicker: 'Billing',
    title: 'Billing and paid alerts',
    copy: 'Use this for payment verification, duplicate charges, missing activation, or billing questions about paid alerts.',
    subject: 'CylinderCheck billing support',
    note: 'Best for subscriptions, payment references, and alert activation issues.',
  },
  {
    icon: TriangleAlert,
    kicker: 'Corrections',
    title: 'Wrong prices or broken pages',
    copy: 'Report wrong prices, missing agency context, misleading shortage flags, or pages that are not working properly on mobile or desktop.',
    subject: 'CylinderCheck data correction',
    note: 'Best for accuracy issues, pricing mismatches, and reports that look unreliable.',
  },
  {
    icon: Store,
    kicker: 'Commercial',
    title: 'Vendor listings and business leads',
    copy: 'Use this for vendor verification, listing edits, lead quality issues, or onboarding questions about business use of CylinderCheck.',
    subject: 'CylinderCheck commercial support',
    note: 'Best for commercial listings, vendor updates, and lead-routing issues.',
  },
  {
    icon: ShieldCheck,
    kicker: 'Account',
    title: 'Sign-in and account access',
    copy: 'Reach out here if sign-in fails, your access flow is stuck, or you need help with account-linked features.',
    subject: 'CylinderCheck account support',
    note: 'Best for authentication, account-linked features, and access restoration.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'How quickly should I expect a reply?',
    answer: 'We aim to respond to support emails within 2 business days. Urgent billing or access issues are prioritized first.',
  },
  {
    question: 'What should I include in my support email?',
    answer: 'Share the route you were on, your device if relevant, your email or phone used for the workflow, and any booking, payment, or report reference you have.',
  },
  {
    question: 'Can I request data correction or vendor removal by email?',
    answer: 'Yes. Send the exact city, PIN, agency, or vendor detail that needs correction along with the issue you noticed and any evidence that helps verify it.',
  },
  {
    question: 'Is support available through WhatsApp?',
    answer: 'Not right now. Support for CylinderCheck is email-only so requests can be tracked clearly and resolved in order.',
  },
]

export function SupportPage() {
  const [copyFeedback, setCopyFeedback] = useState({ key: '', status: '' })
  const feedbackTimerRef = useRef(null)
  const generalSupportBody = useMemo(
    () => [
      'Hello Xisch.Co team,',
      '',
      'I need help with CylinderCheck.',
      '',
      'Issue category:',
      'Route/page:',
      'Reference details:',
      'What happened:',
      '',
      'Thanks,',
    ].join('\n'),
    [],
  )

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const handleCopyEmail = async (label = 'support') => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }

    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopyFeedback({ key: label, status: 'copied' })
    } catch {
      setCopyFeedback({ key: label, status: 'failed' })
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedback({ key: '', status: '' })
    }, 2400)
  }

  return (
    <div className="support-page">
      <PageHeader
        markerShowStatus={false}
        markerStatus="clear"
        markerLabel="Support"
        icon={LifeBuoy}
        title="Support"
        description="Email support for billing, corrections, supplier listings, and account access."
        actions={(
          <Link to="/track" className="btn-ghost">
            Back to Track
          </Link>
        )}
      />

      <div className="support-page__intro">
        <Card variant="featured">
          <CardHeader
            kicker="Contact"
            title="Email Xisch.Co support"
            meta={<span className="reading-meta">Effective {EFFECTIVE_DATE}</span>}
          />
          <CardBody className="support-contact-card">
            <p className="type-reading-copy m-0">
              CylinderCheck support runs through one email inbox: <a href={buildMailto('CylinderCheck support', generalSupportBody)}>{CONTACT_EMAIL}</a>.
              Use the issue lanes below if you want the subject line pre-filled for billing, data fixes, commercial listings, or account help.
            </p>

            <div className="support-contact-card__cta">
              <a
                href={buildGmailCompose('CylinderCheck support', generalSupportBody)}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost support-contact-card__cta--primary"
              >
                <Mail size={16} />
                <span>Open Gmail</span>
              </a>
              <a href={buildMailto('CylinderCheck support', generalSupportBody)} className="btn-ghost">
                <Mail size={16} />
                <span>Email app</span>
              </a>
              <button type="button" className="btn-ghost" onClick={() => handleCopyEmail('support')}>
                {copyFeedback.key === 'support' && copyFeedback.status === 'copied' ? <Check size={16} /> : <Copy size={16} />}
                <span>{copyFeedback.key === 'support' && copyFeedback.status === 'copied' ? 'Copied' : 'Copy email'}</span>
              </button>
            </div>

            {copyFeedback.key === 'support' ? (
              <p className="support-feedback-note m-0" role="status" aria-live="polite">
                {copyFeedback.status === 'failed'
                  ? 'Copy did not complete. Use Gmail compose or select the address manually.'
                  : 'Email address copied to clipboard.'}
              </p>
            ) : null}

            <ul className="reading-list reading-list--dense support-contact-card__notes">
              <li>Open Gmail is the most reliable option if you do not have a default mail app configured.</li>
              <li>If your device mail app does not open, use Gmail compose or copy the address directly.</li>
              <li>Replies come from the same Xisch.Co inbox, with the subject line helping us route the issue faster.</li>
            </ul>
          </CardBody>
        </Card>

        <Card variant="inset">
          <CardHeader kicker="Before you write" title="What to include" meta={<span className="reading-meta">Checklist</span>} />
          <CardBody>
            <ul className="reading-list">
              <li>Tell us which page or workflow you were using.</li>
              <li>Include the email, phone number, PIN, or payment reference involved if relevant.</li>
              <li>Explain what you expected to happen and what actually happened.</li>
              <li>Attach screenshots only when they materially help explain the issue.</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="support-grid">
        {SUPPORT_STREAMS.map(({ icon: Icon, kicker, title, copy, subject, note }) => {
          const body = [
            'Hello Xisch.Co team,',
            '',
            `I need help with: ${title}`,
            '',
            'Route/page:',
            'Reference details:',
            'What happened:',
            '',
            'Thanks,',
          ].join('\n')

          return (
          <Card key={title} variant="raised">
            <CardHeader
              kicker={kicker}
              meta={<span className="reading-meta">Subject line</span>}
              title={
                <span className="support-card__title">
                  <Icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
                  <span>{title}</span>
                </span>
              }
            />
            <CardBody>
              <p className="type-card-copy m-0">{copy}</p>
              <ul className="reading-list reading-list--dense support-stream__notes">
                <li>{note}</li>
                  <li>Replies still come from {CONTACT_EMAIL}.</li>
              </ul>
              <div className="support-stream__actions">
                <a
                  href={buildGmailCompose(subject, body)}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-ledger__link support-stream__link support-stream__link--primary"
                >
                  Open Gmail
                </a>
                <a
                  href={buildMailto(subject, body)}
                  className="footer-ledger__link support-stream__link"
                >
                  Email app
                </a>
                <button
                  type="button"
                  className="footer-ledger__link support-stream__link"
                  onClick={() => handleCopyEmail(subject)}
                >
                  {copyFeedback.key === subject && copyFeedback.status === 'copied' ? 'Copied' : 'Copy email'}
                </button>
              </div>
              {copyFeedback.key === subject ? (
                <p className="support-feedback-note m-0" role="status" aria-live="polite">
                  {copyFeedback.status === 'failed'
                    ? 'Copy did not complete. Open Gmail or select the address manually.'
                    : 'Email address copied to clipboard.'}
                </p>
              ) : null}
            </CardBody>
          </Card>
          )
        })}
      </div>

      <Card variant="raised">
        <CardHeader
          kicker="FAQ"
          title="Common questions"
          meta={<span className="reading-meta">Email support</span>}
        />
        <CardBody className="support-faq">
              {FAQ_ITEMS.map(({ question, answer }) => (
            <Card key={question} variant="inset" size="compact">
              <CardHeader kicker="Question" titleAs="h3" title={question} />
              <CardBody>
                <p className="type-card-copy m-0">{answer}</p>
              </CardBody>
            </Card>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

export default SupportPage
