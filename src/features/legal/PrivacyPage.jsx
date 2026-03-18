import React from 'react'
import LegalPageLayout from './LegalPageLayout'

const CONTACT_EMAIL = 'xisch.co@gmail.com'
const EFFECTIVE_DATE = 'March 18, 2026'

const sections = [
  {
    id: 'information-we-collect',
    kicker: 'Privacy scope',
    title: 'Information we collect',
    content: (
      <>
        <p>
          We collect the information needed to run CylinderCheck reliably. That can include:
        </p>
        <ul className="reading-list">
          <li>Google sign-in profile details such as your email address.</li>
          <li>Contact details you submit for alerts, support, or commercial enquiries.</li>
          <li>Booking and delivery information, PIN codes, shortage reports, and pricing corrections you submit.</li>
          <li>Feedback and other product communication you choose to send us.</li>
          <li>Basic technical data such as browser type, device signals, request logs, and product analytics.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    kicker: 'Processing',
    title: 'How we use information',
    content: (
      <ul className="reading-list">
        <li>To deliver tracking, alerts, shortage intelligence, and commercial lead workflows.</li>
        <li>To maintain sign-in sessions and protect the product against spam, abuse, and duplicate activity.</li>
        <li>To respond to support requests, payment questions, corrections, and feedback.</li>
        <li>To improve data quality, product performance, and reliability across mobile and web.</li>
      </ul>
    ),
  },
  {
    id: 'payments-and-subscriptions',
    kicker: 'Billing',
    title: 'Payments and subscriptions',
    content: (
      <>
        <p>
          Paid alert purchases are processed through Razorpay. CylinderCheck and Xisch.Co do not store your full
          card details. We may store billing references, subscription status, contact details, and fulfillment
          records needed to confirm service delivery, handle support, and prevent fraud.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>Payment card details are handled by the payment processor, not stored by us in full.</li>
          <li>We may retain order references, contact data, and subscription state to fulfill the paid service.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'when-we-share-information',
    kicker: 'Sharing',
    title: 'When we share information',
    content: (
      <>
        <p>We do not sell your personal information. We may share limited information in the following cases:</p>
        <ul className="reading-list">
          <li>With service providers that operate the product, including Supabase, Vercel, Google, and Razorpay.</li>
          <li>When a commercial enquiry needs to be forwarded to a relevant listed supplier or fulfillment partner.</li>
          <li>When required by law, regulation, or a valid safety or fraud-prevention request.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention-and-controls',
    kicker: 'Retention',
    title: 'Data retention and your choices',
    content: (
      <>
        <p>
          We keep information only for as long as it is reasonably needed to operate the service, maintain business
          records, resolve disputes, and comply with legal obligations. Some operational and payment records may be
          retained longer than general usage data.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>You can contact us to request help with account-linked information or alert removal.</li>
          <li>Deletion requests may be reviewed against legal, billing, fraud-prevention, and operational obligations.</li>
        </ul>
        <p>
          You can contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you want to request account
          help, alert removal, or deletion review.
        </p>
      </>
    ),
  },
  {
    id: 'security-and-children',
    kicker: 'Safeguards',
    title: 'Security and children',
    content: (
      <>
        <p>
          We use reasonable administrative and technical safeguards to protect the product, but no internet service
          can promise absolute security. CylinderCheck is not intended for children, and we do not knowingly design
          the service for use by minors.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>We continuously improve safeguards, but no system can guarantee absolute protection.</li>
          <li>If you believe information has been mishandled, contact us directly at {CONTACT_EMAIL}.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'policy-updates',
    kicker: 'Updates',
    title: 'Policy updates and contact',
    content: (
      <>
        <p>
          We may update this policy as the product evolves. When we make material changes, we will update the effective
          date on this page. For privacy questions, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </>
    ),
  },
]

export function PrivacyPage() {
  return (
    <LegalPageLayout
      markerLabel="Privacy"
      title="Privacy Policy"
      description="How Xisch.Co collects, uses, and protects information when you use CylinderCheck."
      effectiveDate={EFFECTIVE_DATE}
      intro="This privacy policy explains what information CylinderCheck collects, why we collect it, how we use it, and what choices you have. It is written for the product as it exists today: community data, alerts, Google sign-in, commercial enquiries, and payment-backed subscriptions."
      sections={sections}
    />
  )
}

export default PrivacyPage
