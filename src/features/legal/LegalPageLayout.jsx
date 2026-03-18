import React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'

export function LegalPageLayout({
  markerLabel,
  title,
  description,
  effectiveDate,
  intro,
  sections,
}) {
  return (
    <div className="reading-page">
      <PageHeader
        markerStatus="clear"
        markerLabel={markerLabel}
        markerSublabel="Xisch.Co"
        title={title}
        description={description}
        actions={(
          <Link to="/track" className="btn-ghost">
            Return to Track
          </Link>
        )}
      />

      <div className="reading-page__intro-grid">
        <Card variant="raised">
          <CardHeader
            kicker="Overview"
            title="What this page covers"
            meta={<span className="reading-meta">Effective {effectiveDate}</span>}
          />
          <CardBody>
            <p className="m-0">{intro}</p>
          </CardBody>
        </Card>

        <Card variant="inset" className="reading-page__toc">
          <CardHeader kicker="On this page" title="Quick navigation" />
          <CardBody>
            <div className="reading-link-list" role="navigation" aria-label={`${title} section links`}>
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="reading-link-list__item">
                  {section.title}
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="reading-page__sections">
        {sections.map((section) => (
          <Card key={section.id} id={section.id} variant="raised" className="reading-section">
            <CardHeader
              kicker={section.kicker || 'Section'}
              title={section.title}
              meta={section.meta ? <span className="reading-meta">{section.meta}</span> : null}
            />
            <CardBody>
              {section.content}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default LegalPageLayout
