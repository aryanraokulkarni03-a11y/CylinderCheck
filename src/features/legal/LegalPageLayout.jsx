import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { springs } from '../../lib/springs'

export function LegalPageLayout({
  markerLabel,
  title,
  description,
  effectiveDate,
  intro,
  sections,
}) {
  const shouldReduceMotion = useReducedMotion()
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections])
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '')

  useEffect(() => {
    if (!sectionIds.length || typeof window === 'undefined') return undefined

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    if (!elements.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: '-18% 0px -56% 0px',
        threshold: [0.2, 0.45, 0.7],
      },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [sectionIds])

  const handleSectionJump = (id) => {
    const target = document.getElementById(id)
    if (!target) return

    setActiveSection(id)
    target.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

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
          <CardHeader
            kicker="On this page"
            title="Quick navigation"
            meta={<span className="reading-meta">Scroll-aware</span>}
          />
          <CardBody>
            <div className="reading-link-list" role="navigation" aria-label={`${title} section links`}>
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  type="button"
                  className={`reading-link-list__item${activeSection === section.id ? ' reading-link-list__item--active' : ''}`}
                  onClick={() => handleSectionJump(section.id)}
                  transition={shouldReduceMotion ? { duration: 0.01 } : springs.smooth}
                  aria-current={activeSection === section.id ? 'true' : undefined}
                >
                  <span className="reading-link-list__eyebrow">
                    {section.kicker || 'Section'}
                  </span>
                  <span className="reading-link-list__title">{section.title}</span>
                  {activeSection === section.id ? (
                    <motion.span
                      layoutId={`${markerLabel}-active-section`}
                      className="reading-link-list__active-rail"
                      transition={shouldReduceMotion ? { duration: 0.01 } : springs.response}
                    />
                  ) : null}
                </motion.button>
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
