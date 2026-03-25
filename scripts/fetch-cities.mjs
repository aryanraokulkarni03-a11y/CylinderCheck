import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// Very simple .env parser for node
function loadEnv() {
  try {
    const envPath = path.join(repoRoot, '.env')
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '')
      }
    })
  } catch (e) {
    // maybe .env doesn't exist depending on CI
  }
}

async function fetchDistinctCities(supabaseUrl, anonKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/rest/v1/lpg_prices?select=city&order=recorded_at.desc&limit=1000`)
    const options = {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Range-Unit': 'items',
      }
    }

    const req = https.get(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const rows = JSON.parse(data)
            // distinct cities, normalized
            const distinct = [...new Set(rows.map(r => r.city).filter(Boolean))]
            resolve(distinct)
          } catch (e) {
            reject(e)
          }
        } else {
          // Soft fail
          console.warn('Failed to fetch cities from supabase, using fallback', data)
          resolve([])
        }
      })
    })

    req.on('error', reject)
  })
}

async function run() {
  loadEnv()
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  let cities = []
  if (supabaseUrl && anonKey) {
    console.log('Fetching active cities from Supabase...')
    cities = await fetchDistinctCities(supabaseUrl, anonKey)
  }

  if (cities.length === 0) {
    // Fallback to major cities if env vars unavailable or request fails
    cities = ['Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Surat', 'Gurugram']
  }

  const outDir = path.join(repoRoot, 'src', 'data')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const outPath = path.join(outDir, 'cities.json')
  fs.writeFileSync(outPath, JSON.stringify(cities, null, 2), 'utf8')
  console.log(`Saved ${cities.length} cities to src/data/cities.json`)
}

run().catch(console.error)
