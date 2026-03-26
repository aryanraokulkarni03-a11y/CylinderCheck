import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const DOMESTIC_PRODUCT = 'domestic_14_2kg'
const RUPEE = '\u20B9'
const STRAIN_RANK = {
  severe: 3,
  active: 2,
  building: 1,
  low: 0,
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function formatLocation(row) {
  const area = String(row.area || '').trim()
  const city = String(row.city || '').trim()
  const pin = String(row.pin || '').trim()

  if (area && city) return `${area}, ${city}`
  if (city && pin) return `${city} (PIN ${pin})`
  if (city) return city
  if (pin) return `PIN ${pin}`
  return 'Unknown area'
}

function sortByStrain(a, b) {
  return (
    (STRAIN_RANK[b.pressure_level] || 0) - (STRAIN_RANK[a.pressure_level] || 0) ||
    (b.report_count_30d || 0) - (a.report_count_30d || 0) ||
    (b.pressure_score || 0) - (a.pressure_score || 0) ||
    (b.delivery_days_median || 0) - (a.delivery_days_median || 0)
  )
}

function sortByHealth(a, b) {
  return (
    (a.pressure_score || 0) - (b.pressure_score || 0) ||
    (a.delivery_days_median || 999) - (b.delivery_days_median || 999) ||
    (b.report_count_30d || 0) - (a.report_count_30d || 0)
  )
}

function hasTrustedSteadyEvidence(row) {
  const reports = Number(row.report_count_30d) || 0
  const medianDays = Number(row.delivery_days_median)
  const confidence = String(row.delivery_confidence_level || '').toLowerCase()

  if (row.pressure_level !== 'low') return false
  if (!Number.isFinite(medianDays) || medianDays <= 0 || medianDays > 5) return false

  return reports >= 2 || confidence === 'high' || confidence === 'medium'
}

async function generatePRReport() {
  console.log('\n=== CYLINDERCHECK MONTHLY PR REPORT ===\n')

  const { data: areas, error } = await supabase
    .from('pin_track_summary_v1')
    .select([
      'pin',
      'city',
      'area',
      'pressure_product_type',
      'pressure_level',
      'pressure_score',
      'report_count_30d',
      'delivery_days_median',
      'delivery_confidence_level',
      'distributor_name',
    ].join(', '))
    .eq('pressure_product_type', DOMESTIC_PRODUCT)
    .in('pressure_level', ['severe', 'active', 'building', 'low'])
    .limit(120)

  if (error) {
    console.error('Error fetching Track PR data:', error)
    console.error('Expected pin_track_summary_v1 to expose domestic household fields such as pressure_level, report_count_30d, and delivery_days_median.')
    return
  }

  const strainedAreas = (areas || [])
    .filter((row) => row.pressure_level === 'severe' || row.pressure_level === 'active')
    .sort(sortByStrain)

  const healthyAreas = (areas || [])
    .filter(hasTrustedSteadyEvidence)
    .sort(sortByHealth)

  console.log('TOP STRAINED HOUSEHOLD AREAS')
  console.log('(Domestic 14.2kg areas currently showing the sharpest delivery strain and strongest local pressure signals)')
  console.log('---------------------------------------------------')

  if (strainedAreas.length === 0) {
    console.log('No severe or active domestic supply choke points detected right now.')
  } else {
    strainedAreas.slice(0, 10).forEach((entry, idx) => {
      const location = formatLocation(entry)
      const reports = entry.report_count_30d || 0
      const medianDays = entry.delivery_days_median ? `${Math.round(entry.delivery_days_median)} days` : 'Delivery window still building'
      const distributor = entry.distributor_name ? ` | Distributor: ${entry.distributor_name}` : ''

      console.log(
        `${idx + 1}. ${location} | Pressure: ${String(entry.pressure_level || 'unknown').toUpperCase()} | Reports: ${reports} | Delivery median: ${medianDays}${distributor}`,
      )
    })
  }

  console.log('\nSTEADIER HOUSEHOLD SUPPLY POCKETS')
  console.log('(Domestic 14.2kg areas currently reading calmer, with lower pressure and cleaner turnaround signals)')
  console.log('---------------------------------------------------')

  if (healthyAreas.length === 0) {
    console.log('Not enough low-pressure domestic areas have strong enough evidence to call out yet.')
  } else {
    healthyAreas.slice(0, 10).forEach((entry, idx) => {
      const location = formatLocation(entry)
      const reports = entry.report_count_30d || 0
      const medianDays = entry.delivery_days_median ? `${Math.round(entry.delivery_days_median)} days` : 'Estimate still building'

      console.log(
        `${idx + 1}. ${location} | Pressure: ${String(entry.pressure_level || 'unknown').toUpperCase()} | Reports: ${reports} | Delivery median: ${medianDays}`,
      )
    })
  }

  const pressAngles = strainedAreas
    .filter((row) => row.delivery_days_median && row.report_count_30d)
    .slice(0, 3)

  if (pressAngles.length > 0) {
    console.log('\nPRESS ANGLES TO WATCH')
    console.log('---------------------------------------------------')
    pressAngles.forEach((entry, idx) => {
      console.log(
        `${idx + 1}. ${formatLocation(entry)} is showing ${entry.pressure_level} household pressure with ${entry.report_count_30d} recent reports and an estimated median delivery window of ${Math.round(entry.delivery_days_median)} days.`,
      )
    })
  }

  console.log('\n=======================================')
  console.log(`Data powered by CylinderCheck.in household tracking for ${DOMESTIC_PRODUCT}.`)
  console.log(`Use tracked city pricing separately for ${RUPEE} market-rate context.`)
  console.log('For press and journalism use.')
}

generatePRReport()
