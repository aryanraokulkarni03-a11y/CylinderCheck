import React from 'react'
import LegalPageLayout from './LegalPageLayout'

const CONTACT_EMAIL = 'xisch.co@gmail.com'
const EFFECTIVE_DATE = 'March 18, 2026'

const sections = [
  {
    id: 'acceptance',
    kicker: 'Agreement',
    title: 'Acceptance of these terms',
    content: (
      <p>
        By accessing or using CylinderCheck, you agree to these Terms of Use. If you do not agree, please do not use
        the service. CylinderCheck is operated by Xisch.Co.
      </p>
    ),
  },
  {
    id: 'service-description',
    kicker: 'Service scope',
    title: 'What CylinderCheck provides',
    content: (
      <>
        <p>
          CylinderCheck provides LPG delivery intelligence, booking guidance, community report signals, alert workflows,
          and commercial enquiry tools. The service is informational and operational in nature.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>It is not an official government, distributor, or agency platform.</li>
          <li>It is designed to help users make faster, better-informed supply decisions.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'accuracy-disclaimer',
    kicker: 'Important',
    title: 'Accuracy, availability, and independence',
    content: (
      <>
        <p>
          We work to keep the service useful and current, but community-sourced data, pricing signals, and delivery
          estimates may be delayed, incomplete, or incorrect. You should always verify final availability, delivery,
          and pricing with the relevant agency, distributor, or supplier before acting on the information.
        </p>
        <p>
          CylinderCheck is not affiliated with Indane, HP Gas, Bharatgas, or any public-sector oil company unless
          explicitly stated otherwise.
        </p>
      </>
    ),
  },
  {
    id: 'accounts-and-authentication',
    kicker: 'Account access',
    title: 'Accounts and Google sign-in',
    content: (
      <>
        <p>
          Some features may require sign-in. You are responsible for the accuracy of the account information you provide
          and for activity that takes place through your account.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>We may restrict or suspend access if we detect misuse, fraud, or automation abuse.</li>
          <li>You should not share account access in ways that compromise the integrity of the service.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-submissions',
    kicker: 'Community input',
    title: 'Reports, corrections, feedback, and leads',
    content: (
      <>
        <p>
          If you submit shortage reports, corrections, feedback, or business leads, you are responsible for ensuring
          the information is lawful, accurate, and not misleading. You must not submit spam, impersonation, abusive
          material, or content that violates another party&apos;s rights.
        </p>
      </>
    ),
  },
  {
    id: 'paid-features',
    kicker: 'Payments',
    title: 'Paid features and billing',
    content: (
      <>
        <p>
          Paid alerts and related premium services are processed through third-party payment providers such as Razorpay.
          Availability of any paid feature may depend on successful payment verification and operational readiness.
        </p>
        <ul className="reading-list">
          <li>We may refuse, pause, or refund a service where payment cannot be verified.</li>
          <li>We may pause or cancel access if the feature cannot be fulfilled operationally.</li>
          <li>We may intervene where misuse, fraud, or abuse is detected.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'commercial-listings',
    kicker: 'Business use',
    title: 'Commercial listings and enquiries',
    content: (
      <>
        <p>
          Commercial listings are provided for discovery and enquiry. Xisch.Co does not guarantee the quality,
          availability, licensing, pricing, or performance of any listed vendor.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>You are responsible for independent verification before relying on a supplier.</li>
          <li>Listings can be updated, removed, or corrected as the product evolves.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    kicker: 'Use limits',
    title: 'Acceptable use',
    content: (
      <ul className="reading-list">
        <li>Do not misuse the service for scraping, spam, harassment, or fraudulent activity.</li>
        <li>Do not interfere with product stability, security, or availability.</li>
        <li>Do not submit false reports, false commercial details, or misleading corrections.</li>
        <li>Do not attempt to reverse engineer, copy, or exploit the product beyond lawful use.</li>
      </ul>
    ),
  },
  {
    id: 'liability-and-updates',
    kicker: 'Limits',
    title: 'Liability, changes, and contact',
    content: (
      <>
        <p>
          CylinderCheck is provided on an as-is and as-available basis. To the maximum extent permitted by law, Xisch.Co
          is not liable for indirect, incidental, consequential, or business losses arising from use of the service.
        </p>
        <ul className="reading-list reading-list--dense">
          <li>We may change, suspend, or discontinue any part of the product at any time.</li>
          <li>If you have questions about these terms, contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
        </ul>
      </>
    ),
  },
]

export function TermsPage() {
  return (
    <LegalPageLayout
      markerLabel="Terms"
      title="Terms of Use"
      description="The core rules, limitations, and responsibilities for using CylinderCheck and its paid features."
      effectiveDate={EFFECTIVE_DATE}
      intro="These terms describe how CylinderCheck can be used, what the service is designed to provide, what it does not guarantee, and the responsibilities that come with using reports, alerts, pricing intelligence, and commercial enquiries."
      sections={sections}
    />
  )
}

export default TermsPage
