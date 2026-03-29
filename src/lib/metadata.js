import { resolveCommercialSeoCitySlug, resolveHouseholdSeoCitySlug } from './utils.js'

const SITE_URL = 'https://www.cylindercheck.in'
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/cylindercheck-logo-lockup-1200x360.png`

function absoluteUrl(path) {
  if (!path) return SITE_URL
  return path.startsWith('http') ? path : `${SITE_URL}${path}`
}

function faqSchema(mainEntity) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }
}

function question(name, text) {
  return {
    '@type': 'Question',
    name,
    acceptedAnswer: {
      '@type': 'Answer',
      text,
    },
  }
}

function webPageSchema({ path, title, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: absoluteUrl(path),
  }
}

function collectionPageSchema({ path, title, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(path),
  }
}

const TRACK_FAQ = faqSchema([
  question(
    'How does CylinderCheck estimate LPG delivery time?',
    'CylinderCheck combines PIN-level averages, recent reports, and your last booking date to show a practical delivery estimate for your area.',
  ),
  question(
    'Can I use CylinderCheck before booking a refill?',
    'Yes. Enter your PIN and last booking date to check local delivery timing, shortage pressure, and the next sensible date to book.',
  ),
  question(
    'Does CylinderCheck show official LPG booking status?',
    'No. CylinderCheck is an independent planning tool. Always confirm booking status and final delivery timing with your LPG agency.',
  ),
])

function cityPageFaqSchema(cityName) {
  return faqSchema([
    question(
      `What is the LPG cylinder price in ${cityName} today?`,
      `CylinderCheck tracks the latest trusted city-level LPG price references for ${cityName}, including the domestic 14.2kg market rate and the commercial 19kg rate when that city data is available.`,
    ),
    question(
      `How should I use the ${cityName} city page before booking a refill?`,
      `Use the ${cityName} page to understand the city-level price picture, local booking signals, and the overall market read first. Then switch to the PIN tracker when you need a more exact area-level delivery and pressure read.`,
    ),
    question(
      `Are ${cityName} LPG city prices the same as the final agency quote?`,
      `No. CylinderCheck shows tracked city market references for ${cityName}. Final booking status, refill timing, and quoted prices still come from your LPG agency or supplier.`,
    ),
    question(
      `When should I use the PIN tracker instead of only the ${cityName} city page?`,
      `Use the PIN tracker whenever you want a more precise local read for your own area inside ${cityName}, especially if delivery timing and pressure can vary between different pockets of the city.`,
    ),
  ])
}

function commercialCityPageFaqSchema(cityName) {
  return faqSchema([
    question(
      `What is the commercial LPG price in ${cityName} today?`,
      `CylinderCheck tracks the latest trusted 19kg commercial LPG market reference for ${cityName} when city-level pricing is available.`,
    ),
    question(
      `How should a business use the ${cityName} commercial LPG page?`,
      `Use the ${cityName} commercial page to understand the tracked 19kg market read first, then browse suppliers if you need availability, delivery, and quote confirmation.`,
    ),
    question(
      `Are ${cityName} commercial LPG prices the same as the final supplier quote?`,
      `No. CylinderCheck shows tracked city-level commercial LPG references for ${cityName}. Final per-cylinder pricing, stock, delivery terms, and payment terms still come from the supplier.`,
    ),
    question(
      `When should I browse suppliers instead of relying only on the ${cityName} commercial LPG page?`,
      `Browse suppliers when you need current stock, delivery reach, account terms, or a quote for your exact business requirement in ${cityName}.`,
    ),
  ])
}

const DEFAULT_SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CylinderCheck',
    url: SITE_URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CylinderCheck',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description:
      'CylinderCheck helps Indian households and businesses check LPG delivery timing, shortage pressure, tracked prices, and supplier signals.',
  },
]

export const ROUTE_METADATA = {
  '/': {
    path: '/',
    title: 'CylinderCheck | Check before you book LPG in your area',
    description:
      'Use your PIN to check LPG delivery timing, shortage pressure, and the next sensible booking date before you book. CylinderCheck also tracks city prices and a separate business supplier path.',
    indexable: true,
    schema: [
      webPageSchema({
        path: '/',
        title: 'CylinderCheck',
        description:
          'Use your PIN to check LPG delivery timing, shortage pressure, and the next sensible booking date before you book.',
      }),
      ...DEFAULT_SCHEMA,
    ],
  },
  '/track': {
    path: '/track',
    title: 'Booking Tracker | Check LPG delivery time and shortage pressure by PIN',
    description:
      'Check LPG delivery timing, booking date, and shortage pressure in your area with your PIN before you book a refill.',
    indexable: true,
    schema: [
      webPageSchema({
        path: '/track',
        title: 'CylinderCheck Booking Tracker',
        description:
          'Check LPG delivery timing, booking date, and shortage pressure in your area with your PIN before you book a refill.',
      }),
      TRACK_FAQ,
    ],
  },
  '/reports': {
    path: '/reports',
    title: 'Community Reports | Delivery delays and LPG shortage pressure',
    description:
      'Read community LPG delivery reports, shortage pressure signals, and agency issues in your area.',
    indexable: true,
    schema: [
      collectionPageSchema({
        path: '/reports',
        title: 'CylinderCheck Community Reports',
        description:
          'Community reports about LPG delivery delays, shortage pressure, and agency issues.',
      }),
    ],
  },
  '/news': {
    path: '/news',
    title: 'LPG News | Shortages, price changes, and policy moves across India',
    description:
      'Follow LPG news across India, including shortages, price changes, and policy moves tagged to cities when location is clear.',
    indexable: true,
    schema: [
      collectionPageSchema({
        path: '/news',
        title: 'CylinderCheck LPG News',
        description:
          'Shortages, price changes, and policy moves that affect LPG across India.',
      }),
    ],
  },
  '/alerts': {
    path: '/alerts',
    title: 'LPG Alerts | Free email booking reminders',
    description:
      'Save a free email reminder 2 days before your next LPG booking date. Plus stays dark until delivery goes live reliably.',
    indexable: true,
    schema: [
      webPageSchema({
        path: '/alerts',
        title: 'CylinderCheck Alerts',
        description:
          'Save a free WhatsApp reminder 2 days before your next LPG booking date.',
      }),
    ],
  },
  '/business': {
    path: '/business',
    title: 'Commercial LPG Suppliers | Track 19kg prices and browse verified suppliers',
    description:
      'Compare tracked 19kg LPG prices and browse verified private LPG suppliers by state for restaurants, caterers, hotels, and other business use.',
    indexable: true,
    schema: [
      collectionPageSchema({
        path: '/business',
        title: 'CylinderCheck Commercial LPG Suppliers',
        description:
          'Compare tracked 19kg LPG prices and browse verified private LPG suppliers by state.',
      }),
    ],
  },
  '/commercial': {
    path: '/business',
    title: 'Commercial LPG Suppliers | Track 19kg prices and browse verified suppliers',
    description:
      'Compare tracked 19kg LPG prices and browse verified private LPG suppliers by state for restaurants, caterers, hotels, and other business use.',
    indexable: false,
    schema: [],
  },
  '/support': {
    path: '/support',
    title: 'Support | CylinderCheck help and issue reporting',
    description:
      'Get support for CylinderCheck, including report corrections, alert issues, and product feedback.',
    indexable: true,
    schema: [
      webPageSchema({
        path: '/support',
        title: 'CylinderCheck Support',
        description:
          'Support and issue reporting for CylinderCheck users.',
      }),
    ],
  },
  '/privacy': {
    path: '/privacy',
    title: 'Privacy Policy | CylinderCheck',
    description:
      'Read the CylinderCheck privacy policy for data use, alerts, sign-in, and payments.',
    indexable: true,
    schema: [
      webPageSchema({
        path: '/privacy',
        title: 'CylinderCheck Privacy Policy',
        description:
          'Privacy policy for CylinderCheck.',
      }),
    ],
  },
  '/terms': {
    path: '/terms',
    title: 'Terms of Use | CylinderCheck',
    description:
      'Read the CylinderCheck terms of use for community reports, alerts, payments, and supplier information.',
    indexable: true,
    schema: [
      webPageSchema({
        path: '/terms',
        title: 'CylinderCheck Terms of Use',
        description:
          'Terms of use for CylinderCheck.',
      }),
    ],
  },
  '/bangalore-lpg-price': {
    path: '/bangalore-lpg-price',
    title: 'Bangalore LPG Price | Domestic and commercial city rates',
    description:
      'Check Bangalore LPG prices with tracked domestic 14.2kg and commercial 19kg city-level rates, plus practical guidance before you book or buy.',
    indexable: false,
    schema: [],
  },
  '/bangalore-lpg-delivery-time': {
    path: '/bangalore-lpg-delivery-time',
    title: 'Bangalore LPG Delivery Time | Check before you book',
    description:
      'Use CylinderCheck to judge LPG delivery timing, shortage pressure, and the next sensible booking date in Bangalore before you place a refill order.',
    indexable: false,
    schema: [],
  },
  '/bangalore-commercial-lpg': {
    path: '/bangalore-commercial-lpg',
    title: 'Bangalore Commercial LPG | 19kg price and supplier directory',
    description:
      'Browse Bangalore commercial LPG guidance, tracked 19kg city pricing, and how to compare suppliers for restaurants, caterers, and hotels.',
    indexable: false,
    schema: [],
  },
  '/cities': {
    path: '/cities',
    title: 'LPG Prices & Delivery Tracking by City | CylinderCheck',
    description: 'Find today\'s 14.2kg domestic and 19kg commercial LPG cylinder rates, tracking trends, and exact delivery estimates by city across India.',
    indexable: true,
    schema: [
      collectionPageSchema({
        path: '/cities',
        title: 'Check LPG Prices by City',
        description: 'Find today\'s domestic and commercial LPG cylinder rates by city across India.'
      })
    ]
  },
  '/account': {
    path: '/account',
    title: 'Account | CylinderCheck',
    description: 'Manage your CylinderCheck account.',
    indexable: false,
    schema: [],
  },
  '/admin': {
    path: '/admin',
    title: 'Admin | CylinderCheck',
    description: 'CylinderCheck admin view.',
    indexable: false,
    schema: [],
  },
}

export function getRouteMetadata(pathname = '/', options = {}) {
  const householdSeoCities = Array.isArray(options.householdSeoCities) ? options.householdSeoCities : []
  const householdSeoCitiesLoaded =
    typeof options.householdSeoCitiesLoaded === 'boolean'
      ? options.householdSeoCitiesLoaded
      : householdSeoCities.length > 0

  const commercialCityMatch = pathname.match(/^\/commercial-lpg-price-in-([a-z0-9-]+)$/)
  if (commercialCityMatch) {
    const commercialCity = resolveCommercialSeoCitySlug(commercialCityMatch[1])
    if (!commercialCity) {
      return ROUTE_METADATA['/business']
    }

    const cityName = commercialCity.cityName
    const canonicalPath = `/commercial-lpg-price-in-${commercialCity.canonicalSlug}`
    const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())

    return {
      path: canonicalPath,
      canonicalUrl: absoluteUrl(canonicalPath),
      ogTitle: `Commercial LPG Price in ${cityName} Today \u2014 ${monthYear}`,
      ogDescription: `Check the tracked 19kg commercial LPG price in ${cityName}, browse suppliers, and compare the city market read before you call for a business refill.`,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
      title: `Commercial LPG Price in ${cityName} Today \u2014 ${monthYear}`,
      description: `Check the tracked 19kg commercial LPG price in ${cityName}, browse suppliers, and compare the city market read before you call for a business refill.`,
      indexable: true,
      schema: [
        webPageSchema({
          path: canonicalPath,
          title: `Commercial LPG Price in ${cityName} Today \u2014 ${monthYear}`,
          description: `Check the tracked 19kg commercial LPG price in ${cityName}, browse suppliers, and compare the city market read before you call for a business refill.`,
        }),
        commercialCityPageFaqSchema(cityName),
        ...DEFAULT_SCHEMA,
      ],
    }
  }

  // Check for dynamic city routes
  const cityMatch = pathname.match(/^\/lpg-price-in-([a-z0-9-]+)$/)
  if (cityMatch) {
    if (!householdSeoCitiesLoaded) {
      return {
        ...ROUTE_METADATA['/cities'],
        path: pathname,
        canonicalUrl: absoluteUrl(pathname),
        indexable: false,
        schema: [],
      }
    }

    const householdCity = resolveHouseholdSeoCitySlug(cityMatch[1], householdSeoCities)
    if (!householdCity) {
      return ROUTE_METADATA['/track']
    }

    const cityName = householdCity.cityName
    const canonicalPath = `/lpg-price-in-${householdCity.canonicalSlug}`
    const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
    
    return {
      path: canonicalPath,
      canonicalUrl: absoluteUrl(canonicalPath),
      ogTitle: `LPG Cylinder Price in ${cityName} Today \u2014 ${monthYear}`,
      ogDescription: `Check ${cityName} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Compare rates, shortages, and delivery estimates for Indane, HP Gas, and Bharat Gas.`,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
      title: `LPG Cylinder Price in ${cityName} Today \u2014 ${monthYear}`,
      description: `Check ${cityName} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Compare rates, shortages, and delivery estimates for Indane, HP Gas, and Bharat Gas.`,
      indexable: true,
      schema: [
        webPageSchema({
          path: canonicalPath,
          title: `LPG Cylinder Price in ${cityName} Today \u2014 ${monthYear}`,
          description: `Check ${cityName} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Compare rates, shortages, and delivery estimates for Indane, HP Gas, and Bharat Gas.`
        }),
        cityPageFaqSchema(cityName),
        ...DEFAULT_SCHEMA
      ]
    }
  }

  const route = ROUTE_METADATA[pathname] || ROUTE_METADATA['/track']
  const canonicalUrl = absoluteUrl(route.path)
  const ogTitle = route.ogTitle || route.title
  const ogDescription = route.ogDescription || route.description

  return {
    ...route,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage: route.ogImage || DEFAULT_OG_IMAGE,
    twitterCard: route.twitterCard || 'summary_large_image',
  }
}

export function getIndexableMetadataEntries() {
  return Object.values(ROUTE_METADATA).filter((entry) => entry.indexable)
}

export { DEFAULT_OG_IMAGE, SITE_URL }
