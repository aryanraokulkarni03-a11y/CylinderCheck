import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getIndexableMetadataEntries, SITE_URL } from '../src/lib/metadata.js'
import { COMMERCIAL_SEO_CITIES } from '../src/lib/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const sitemapPath = path.join(repoRoot, 'public', 'sitemap.xml')
const citiesPath = path.join(repoRoot, 'src', 'data', 'cities.json')

let entries = getIndexableMetadataEntries()

if (fs.existsSync(citiesPath)) {
  try {
    const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'))
    cities.forEach(city => {
      const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      // Prevent duplicates if already hardcoded
      if (!entries.find(e => e.path === `/lpg-price-in-${citySlug}`)) {
        entries.push({ path: `/lpg-price-in-${citySlug}` })
      }
    })
  } catch (e) {
    console.error('Failed to parse cities.json for sitemap', e)
  }
}

COMMERCIAL_SEO_CITIES.forEach(city => {
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  if (!entries.find(e => e.path === `/commercial-lpg-price-in-${citySlug}`)) {
    entries.push({ path: `/commercial-lpg-price-in-${citySlug}` })
  }
})

const lastmod = new Date().toISOString().slice(0, 10)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const url = `${SITE_URL}${entry.path}`
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
  })
  .join('\n')}
</urlset>
`

fs.writeFileSync(sitemapPath, xml, 'utf8')
