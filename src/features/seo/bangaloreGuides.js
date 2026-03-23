export const BANGALORE_GUIDES = {
  '/bangalore-lpg-price': {
    kind: 'price',
    title: 'Bangalore LPG price',
    description:
      'Check Bangalore LPG pricing with tracked domestic and commercial city rates before you book a refill or call a supplier.',
    intro:
      'Use this page when you want a clean market reference for Bangalore. It helps households judge whether a refill price looks normal and helps businesses compare 19kg quotes against a tracked city benchmark.',
    insights: [
      {
        eyebrow: 'Households',
        title: 'Check the domestic city rate first',
        body:
          'Start with the tracked Bangalore 14.2kg price so you have a baseline before you call the agency or book a refill.',
      },
      {
        eyebrow: 'Businesses',
        title: 'Use the 19kg rate as your negotiation floor',
        body:
          'Restaurants, cloud kitchens, caterers, and hotels can compare supplier quotes against the tracked 19kg city price before locking a refill.',
      },
    ],
    callout:
      'CylinderCheck tracks published city LPG rates. Final domestic and commercial quotes still come from the agency or supplier.',
    primaryLink: {
      to: '/track',
      label: 'Check your area before you book',
    },
    secondaryLink: {
      to: '/business',
      label: 'Browse commercial suppliers',
    },
  },
  '/bangalore-lpg-delivery-time': {
    kind: 'delivery',
    title: 'Bangalore LPG delivery time',
    description:
      'Check Bangalore LPG delivery timing, shortage pressure, and the next sensible booking date before you place a refill order.',
    intro:
      'CylinderCheck is most useful before you book. Use a Bangalore PIN to see how long delivery is taking nearby, whether supply pressure is building, and whether your booking window is worth using now.',
    insights: [
      {
        eyebrow: 'Timing',
        title: 'Use your last booking date',
        body:
          'If you know your last booking date, CylinderCheck can estimate the next sensible booking date instead of forcing you to guess.',
      },
      {
        eyebrow: 'Pressure',
        title: 'Watch shortage pressure, not just headlines',
        body:
          'Local pressure can change before city-wide news catches up. A Bangalore PIN check is a better planning signal than broad shortage headlines alone.',
      },
    ],
    callout:
      'The booking tracker is a planning tool. Final booking eligibility and delivery timing still come from your LPG agency.',
    primaryLink: {
      to: '/track',
      label: 'Open the booking tracker',
    },
    secondaryLink: {
      to: '/news',
      label: 'Read the latest LPG news',
    },
  },
  '/bangalore-commercial-lpg': {
    kind: 'commercial',
    title: 'Bangalore commercial LPG',
    description:
      'Compare Bangalore commercial LPG pricing and browse supplier information for restaurants, caterers, hotels, and other business use.',
    intro:
      'This page is for business buyers who need 19kg LPG. Start with the tracked Bangalore city price, then compare supplier notes, service coverage, and direct contact details before you commit to a refill.',
    insights: [
      {
        eyebrow: 'Before you call',
        title: 'Know the tracked 19kg city range',
        body:
          'A city reference helps you spot whether a quoted refill is normal, aggressive, or worth challenging before you discuss stock and delivery.',
      },
      {
        eyebrow: 'During the call',
        title: 'Confirm stock, delivery terms, and service area',
        body:
          'Ask the supplier what areas they cover in Bangalore, whether 19kg stock is ready, and what delivery timing and payment terms apply.',
      },
    ],
    callout:
      'CylinderCheck lists supplier details and tracked market prices. Final commercial terms always come from the supplier.',
    primaryLink: {
      to: '/business',
      label: 'Browse commercial suppliers',
    },
    secondaryLink: {
      to: '/track',
      label: 'Use the booking tracker',
    },
  },
}
