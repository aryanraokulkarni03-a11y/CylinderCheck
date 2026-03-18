import React from 'react'
import { Mail, Receipt, ShieldCheck, Store, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

const CONTACT_EMAIL = 'xisch.co@gmail.com'
const EFFECTIVE_DATE = 'March 18, 2026'

const SUPPORT_STREAMS = [
  {
    icon: Receipt,
    kicker: 'Billing',
    title: 'Paid alerts and payments',
    copy: 'Use this lane for payment verification, duplicate charges, missing activation, or billing clarification on paid alert workflows.',
    subject: 'CylinderCheck billing support',
  },
  {
    icon: TriangleAlert,
    kicker: 'Corrections',
    title: 'Wrong data or broken signals',
    copy: 'Flag incorrect pricing, missing agency context, bad shortage signals, or pages that are not behaving correctly on mobile or desktop.',
    subject: 'CylinderCheck data correction',
  },
  {
    icon: Store,
    kicker: 'Commercial',
    title: 'Vendor listings and business leads',
    copy: 'Use this for vendor verification, listing edits, lead quality issues, or onboarding questions about business use of CylinderCheck.',
    subject: 'CylinderCheck commercial support',
  },
  {
    icon: ShieldCheck,
    kicker: 'Account',
    title: 'Google sign-in and access',
    copy: 'Reach out here if sign-in fails, your access flow is stuck, or you need help understanding how account-linked features behave.',
    subject: 'CylinderCheck account support',
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
  return (
    <div className="support-page">
      <PageHeader
        markerStatus="clear"
        markerLabel="Support"
        markerSublabel="Xisch.Co"
        title="Support Center"
        description="Help for alerts, billing, reports, vendor listings, and account access. Built to be clear on mobile first, without dead-end support loops."
        actions={(
          <Link to="/track" className="btn-ghost">
            Return to Track
          </Link>
        )}
      />

      <div className="support-page__intro">
        <Card variant="featured">
          <CardHeader
            kicker="Contact"
            title="Email support"
            meta={<span className="reading-meta">Effective {EFFECTIVE_DATE}</span>}
          />
          <CardBody className="support-contact-card">
            <p className="m-0">
              CylinderCheck support is handled by Xisch.Co via email only. If you need help, write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>

            <div className="support-contact-card__cta">
              <a href={`mailto:${CONTACT_EMAIL}`} className="btn-ghost">
                <Mail size={16} />
                <span>Email support</span>
              </a>
            </div>
          </CardBody>
        </Card>

        <Card variant="inset">
          <CardHeader kicker="Before you write" title="What helps us resolve things faster" />
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
        {SUPPORT_STREAMS.map(({ icon: Icon, kicker, title, copy, subject }) => (
          <Card key={title} variant="raised">
            <CardHeader
              kicker={kicker}
              title={
                <span className="support-card__title">
                  <Icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
                  <span>{title}</span>
                </span>
              }
            />
            <CardBody>
              <p className="m-0">{copy}</p>
              <div className="support-stream__actions">
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
                  className="footer-ledger__link support-stream__link"
                >
                  Email this team
                </a>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card variant="raised">
        <CardHeader
          kicker="FAQ"
          title="Common support questions"
          meta={<span className="reading-meta">Email-first support</span>}
        />
        <CardBody className="support-faq">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <Card key={question} variant="inset" size="compact">
              <CardHeader titleAs="h3" title={question} />
              <CardBody>
                <p className="m-0">{answer}</p>
              </CardBody>
            </Card>
          ))}
        </CardBody>
      </Card>

      <Card variant="inset">
        <CardHeader
          kicker="Related"
          title="Legal and trust"
          meta={<span className="reading-meta">Independent product</span>}
        />
        <CardBody>
          <p>
            For details on how data is handled and how the product should be used, visit the pages below.
          </p>
          <div className="support-related-links">
            <Link to="/privacy" className="btn-ghost">
              Privacy
            </Link>
            <Link to="/terms" className="btn-ghost">
              Terms
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default SupportPage
