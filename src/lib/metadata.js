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

export function getRouteMetadata(pathname = '/') {
  // Check for dynamic city routes
  const cityMatch = pathname.match(/^\/lpg-price-in-([a-z0-9-]+)$/)
  if (cityMatch) {
    const citySlug = cityMatch[1]
    const cityName = citySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
    
    return {
      path: pathname,
      canonicalUrl: absoluteUrl(pathname),
      ogTitle: `LPG Cylinder Price in ${cityName} Today \u2014 ${monthYear}`,
      ogDescription: `Check ${cityName} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Compare rates, shortages, and delivery estimates for Indane, HP Gas, and Bharat Gas.`,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
      title: `LPG Cylinder Price in ${cityName} Today \u2014 ${monthYear}`,
      description: `Check ${cityName} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Compare rates, shortages, and delivery estimates for Indane, HP Gas, and Bharat Gas.`,
      indexable: true,
      schema: [
        webPageSchema({
          path: pathname,
          title: `LPG Cylinder Price in ${cityName} Today \u2014 ${monthYear}`,
          description: `Check ${cityName} LPG cylinder price today for 14.2kg domestic and 19kg commercial refills. Compare rates, shortages, and delivery estimates for Indane, HP Gas, and Bharat Gas.`
        }),
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
