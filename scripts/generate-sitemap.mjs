import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getIndexableMetadataEntries, SITE_URL } from '../src/lib/metadata.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const sitemapPath = path.join(repoRoot, 'public', 'sitemap.xml')

const entries = getIndexableMetadataEntries()
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
