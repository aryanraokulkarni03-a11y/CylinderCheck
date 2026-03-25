import { MapPin, Store, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'

const ARROW = '\u2192'
const RUPEE = '\u20B9'

const ICONS = {
  price: MapPin,
  delivery: Truck,
  commercial: Store,
}

function InsightCard({ title, body }) {
  return (
    <Card variant="inset" className="h-full">
      <CardHeader title={title} titleAs="h2" />
      <CardBody>
        <p className="type-card-copy mb-0">{body}</p>
      </CardBody>
    </Card>
  )
}

export default function BangaloreGuidePage({
  kind,
  title,
  description,
  intro,
  insights,
  callout,
  primaryLink,
  secondaryLink,
  mapPrices = {},
}) {
  const Icon = ICONS[kind] || MapPin
  const bangaloreDomestic = mapPrices?.Bangalore?.domestic_14_2kg?.price
  const bangaloreCommercial = mapPrices?.Bangalore?.commercial_19kg?.price

  return (
    <div className="page-root">
      <PageHeader
        icon={Icon}
        title={title}
        description={description}
      />

      <div className="page-grid-dual">
        <Card>
          <CardHeader
            title="What this page helps you decide"
            titleAs="h2"
          />
          <CardBody>
            <p className="type-card-copy mb-4">{intro}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((item) => (
                <InsightCard
                  key={item.title}
                  title={item.title}
                  body={item.body}
                />
              ))}
            </div>
          </CardBody>
        </Card>

        <Card variant="inset">
          <CardHeader
            title="Live Bangalore price signal"
            titleAs="h2"
          />
          <CardBody>
            <div className="space-y-4">
              <div className="rounded-[18px] border border-[var(--divider)] bg-[var(--bg-raised)] px-4 py-4">
                <div className="type-card-title mb-2">Domestic 14.2kg</div>
                <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                  {bangaloreDomestic ? `${RUPEE}${bangaloreDomestic}` : 'Waiting for latest scrape'}
                </div>
              </div>
              <div className="rounded-[18px] border border-[var(--divider)] bg-[var(--bg-raised)] px-4 py-4">
                <div className="type-card-title mb-2">Commercial 19kg</div>
                <div className="type-data-value type-data-value--hero text-[var(--text-primary)]">
                  {bangaloreCommercial ? `${RUPEE}${bangaloreCommercial}` : 'Waiting for latest scrape'}
                </div>
              </div>
              <Callout tone="accent" edge={false}>
                <p className="type-note mb-0">{callout}</p>
              </Callout>
              <div className="flex flex-col gap-3 md:flex-row">
                <Link to={primaryLink.to} className="btn-ghost justify-center">
                  {primaryLink.label} {ARROW}
                </Link>
                <Link to={secondaryLink.to} className="btn-ghost justify-center">
                  {secondaryLink.label} {ARROW}
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
