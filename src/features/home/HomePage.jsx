import React, { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Building2, Newspaper, ShieldCheck, Target, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn'
import BeforeYouCheckSection from '../../components/shared/BeforeYouCheckSection'
import { PriceTicker } from '../../components/shared/PriceTicker'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import { Field } from '../../components/ui/Field'
import BookingDatePicker from '../track/BookingDatePicker'
import { springs } from '../../lib/springs'
import citiesData from '../../data/cities.json'

const RUPEE = '\u20B9'

function formatTrackedPrice(value) {
  return Number.isFinite(value) ? `${RUPEE}${value}` : 'Waiting for latest scrape'
}

export function HomePage({
  pin,
  setPin,
  lastBooking,
  setLastBooking,
  mapPrices,
  pricesUpdatedAt,
  shortageSummary,
  onPrimaryCheck,
}) {
  const shouldReduceMotion = useReducedMotion()
  const pinInputRef = useRef(null)
  const [pinError, setPinError] = useState('')
  const bangaloreDomestic = mapPrices?.Bangalore?.domestic_14_2kg?.price
  const bangaloreCommercial = mapPrices?.Bangalore?.commercial_19kg?.price
  const featuredCities = useMemo(
    () =>
      [...(citiesData || [])]
        .slice(0, 6)
        .map((city) => ({
          city,
          slug: city.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        })),
    [],
  )
  const liveSignalsLabel = shortageSummary?.activePinCount
    ? `${shortageSummary.activePinCount} active pressure reads`
    : 'Community signals are still building'

  const proofCards = [
    {
      title: 'Bangalore domestic 14.2kg',
      value: formatTrackedPrice(bangaloreDomestic),
      note: 'Latest trusted city price',
    },
    {
      title: 'Bangalore commercial 19kg',
      value: formatTrackedPrice(bangaloreCommercial),
      note: 'Separate business-side reference',
    },
    {
      title: 'Pressure coverage',
      value: liveSignalsLabel,
      note: shortageSummary?.hotspot
        ? `Current hotspot: ${shortageSummary.hotspot}`
        : 'Latest city and PIN-level signals',
    },
  ]

  const planningCards = [
    {
      icon: Target,
      title: 'Built for repeat household planning',
      body:
        'Check once before each refill cycle so timing and pressure are clearer before the delay actually starts.',
    },
    {
      icon: TriangleAlert,
      title: 'Signals local strain before broad headlines',
      body:
        'Local strain often shows up earlier than broad city chatter. That is when the tracker is most useful.',
    },
    {
      icon: ShieldCheck,
      title: 'Honest about evidence strength',
      body:
        'This is a planning tool, not an official booking feed. It tells you how strong the evidence is instead of faking certainty.',
    },
  ]

  const handlePrimaryAction = () => {
    if (!pin || pin.length !== 6) {
      setPinError('Enter a valid 6-digit PIN to open the tracker.')
      pinInputRef.current?.focus()
      return
    }

    setPinError('')
    onPrimaryCheck?.()
  }

  return (
    <div className="page-root home-page">
      <section className="home-hero">
        <div className="home-hero__grid">
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : springs.arrival}
          className="home-hero__copy"
        >
          <h1 className="home-hero__title hero-title">
            Read your area before the refill turns urgent.
          </h1>
            <p className="type-page-desc home-hero__desc">
              Enter your PIN once and get a clearer household planning read: delivery timing, local
              pressure, and the next sensible booking window. Business LPG stays on its own separate
              path.
            </p>

            <div className="home-hero__signal-line" aria-label="What the tracker helps with">
              <span>Delivery timing</span>
              <span>Pressure signal</span>
              <span>Booking date</span>
            </div>

            <div className="home-hero__proof">
              <span className="home-proof-chip">Household-first tracker</span>
              <span className="home-proof-chip">PIN-level planning</span>
              <span className="home-proof-chip">Tracked city references</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { ...springs.arrival, delay: 0.08 }}
          className="home-hero__panel-wrap"
        >
          <Card className="home-hero__panel card--utility-tight" variant="inset">
            <CardHeader title="Open the booking tracker" titleAs="h2">
              <p className="card-header__description type-card-copy mb-0">
                Enter your area once here and we&apos;ll carry it into the tracker. Add your last
                booking date too if you want a sharper read.
              </p>
            </CardHeader>

              <CardBody>
                <div className="home-hero__form">
                  <Field id="home-pin-input" label="Your 6-digit PIN" required error={pinError}>
                    <input
                      ref={pinInputRef}
                      id="home-pin-input"
                      className="input type-data-input min-h-[52px]"
                      placeholder="Enter your area PIN"
                      value={pin}
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(event) => {
                        const nextPin = event.target.value.replace(/\D/g, '')
                        setPin(nextPin)
                        if (pinError) {
                          setPinError('')
                        }
                      }}
                      onKeyDown={(event) => event.key === 'Enter' && handlePrimaryAction()}
                    />
                  </Field>

                  <Field id="home-booking-date" label="Last booking date" meta="Optional but useful">
                    <BookingDatePicker
                      id="home-booking-date"
                      value={lastBooking}
                      onChange={setLastBooking}
                    />
                  </Field>

                  <div className="home-hero__actions">
                    <LiquidGlassBtn onClick={handlePrimaryAction} className="w-full justify-center">
                      Check your PIN <ArrowRight size={16} />
                    </LiquidGlassBtn>
                    <Link to="/business" className="btn-ghost w-full justify-center">
                      For businesses <ArrowRight size={16} />
                    </Link>
                  </div>

                  <Callout tone="clear" edge={false} className="home-hero__callout">
                    <p className="type-note mb-0">
                      CylinderCheck is an independent planning tool. Always confirm final booking
                      status and delivery timing with your LPG agency.
                    </p>
                  </Callout>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="page-section page-section--tight">
        <PriceTicker mapPrices={mapPrices} className="!mb-0" />
        <div className="home-proof-grid">
          {proofCards.map((card) => (
            <Card key={card.title} variant="inset" className="home-proof-card">
              <CardBody className="home-proof-card__body">
                <p className="type-card-title mb-1">{card.title}</p>
                <div className="home-proof-card__value">{card.value}</div>
                <p className="type-note mb-0">{card.note}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        {pricesUpdatedAt ? (
          <p className="type-note home-proof-grid__note">
            Published prices and signals refresh in the live product when trusted data is available.
          </p>
        ) : null}
      </section>

      <section className="page-section home-city-hub">
        <Card variant="inset" className="home-city-hub__card">
          <CardHeader title="Browse tracked LPG city pages" titleAs="h2">
            <p className="card-header__description type-card-copy mb-0">
              Google is already finding CylinderCheck for city LPG price intent. These city pages
              give households a quicker way into local price checks, booking signals, and the PIN
              tracker.
            </p>
          </CardHeader>
          <CardBody className="home-city-hub__body">
            <div className="home-city-hub__grid">
              {featuredCities.map(({ city, slug }) => (
                <Link
                  key={slug}
                  to={`/lpg-price-in-${slug}`}
                  className="home-city-hub__link"
                >
                  <span className="type-card-title">{city}</span>
                  <span className="type-note">
                    LPG price, pressure signals, and booking guidance {ARROW}
                  </span>
                </Link>
              ))}
            </div>

            <div className="home-city-hub__actions">
              <Link to="/cities" className="glass-btn w-full justify-center">
                Open all city pages <ArrowRight size={16} />
              </Link>
            </div>
          </CardBody>
        </Card>
      </section>

      <BeforeYouCheckSection
        className="home-before-you-check"
        title="What you'll see before you place a refill"
        description="Start with your PIN. We keep the read practical: delivery timing, local pressure, and when it makes sense to book."
      />

      <section className="home-planning-strip">
        <div className="home-section-heading">
          <h2 className="type-section-title home-section-heading__title">
            Useful before the booking gets messy, not after it already feels late.
          </h2>
        </div>

        <div className="home-planning-grid">
          {planningCards.map(({ icon: Icon, title, body }) => (
            <Card key={title} variant="inset" className="home-planning-card">
              <CardBody>
                <span className="home-planning-card__icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <p className="type-card-title mb-2">{title}</p>
                <p className="type-note mb-0">{body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-business-rail">
        <Card className="home-business-rail__card" variant="inset">
          <CardBody className="home-business-rail__body">
            <div className="home-business-rail__copy">
              <h2 className="type-section-title mb-2">Need commercial LPG instead?</h2>
              <p className="type-card-copy mb-0">
                Compare tracked 19kg market references and browse supplier listings without mixing
                that workflow into the household booking tracker.
              </p>
            </div>

            <div className="home-business-rail__actions">
              <Link to="/business" className="btn-ghost w-full justify-center">
                <Building2 size={16} /> Open business directory
              </Link>
              <Link to="/news" className="btn-ghost w-full justify-center">
                <Newspaper size={16} /> Read LPG news
              </Link>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  )
}

export default HomePage
