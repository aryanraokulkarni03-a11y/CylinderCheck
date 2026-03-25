import React from 'react'
import { CalendarRange, Clock3, MapPin, Target } from 'lucide-react'
import { Card } from '../ui/Card'
import { CardBody, CardHeader } from '../ui/CardParts'

const BEFORE_YOU_CHECK_ITEMS = [
  {
    icon: Clock3,
    title: 'How refills are moving near your PIN',
    note: 'See the strongest local delivery signal we currently have, with evidence level built in.',
  },
  {
    icon: MapPin,
    title: 'Whether local strain is building',
    note: 'See whether recent local reports suggest calm conditions, early pressure, or active strain.',
  },
  {
    icon: CalendarRange,
    title: 'When you can book again',
    note: 'Use your last booking date to judge whether to book now or wait.',
  },
]

export function BeforeYouCheckSection({
  className = '',
  title = "What you'll get after you enter your PIN",
  description = "You'll get a local delivery estimate, supply pressure signal, and a practical booking date for your area.",
  titleAs = 'h2',
  compact = false,
  showOptionalDetails = true,
}) {
  return (
    <Card
      variant="inset"
      className={`before-you-check card--utility-tight ${compact ? 'before-you-check--compact' : ''} ${className}`.trim()}
    >
      <CardHeader title={title} titleAs={titleAs}>
        <p className="card-header__description type-card-copy mb-0 max-w-[38ch]">
          {description}
        </p>
      </CardHeader>

      <CardBody className="pt-1">
        <div className="before-you-check__grid">
          {BEFORE_YOU_CHECK_ITEMS.map(({ icon: Icon, title: itemTitle, note }, index) => (
            <div
              key={itemTitle}
              className={`before-you-check__item ${index === 2 ? 'before-you-check__item--wide' : ''}`}
            >
              <div className="before-you-check__item-row">
                <span className="before-you-check__icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="type-card-title mb-1">{itemTitle}</p>
                  <p className="type-note mb-0 max-w-[40ch]">{note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showOptionalDetails ? (
          <div className="before-you-check__detail">
            <div className="before-you-check__item-row">
              <span className="before-you-check__icon before-you-check__icon--muted" aria-hidden="true">
                <Target size={18} />
              </span>
              <div className="min-w-0">
                <p className="type-card-title mb-1">Optional details help</p>
                <p className="type-note mb-0">
                  Add your last booking date and cylinder level for a more accurate booking priority read.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}

export default BeforeYouCheckSection
