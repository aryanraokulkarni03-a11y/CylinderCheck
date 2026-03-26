import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generatePRReport() {
  console.log("\n=== CYLINDERCHECK MONTHLY PR REPORT ===\n")
  
  // Fetch live tracking data to find the most strained cities
  const { data: areas, error } = await supabase
    .from('pin_track_summary_v1')
    .select('city, count_entries, status')
    .order('count_entries', { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching data:", error)
    return
  }

  // Filter for areas under strain (status = critical/low)
  const strainedAreas = areas?.filter(a => a.status === 'critical' || a.status === 'low') || []
  
  console.log(`\n🔴 TOP STRAINED CITIES / PIN CODES`)
  console.log(`(Areas currently experiencing the highest delivery delays and lowest supply pressure)`)
  console.log(`---------------------------------------------------`)
  
  if (strainedAreas.length === 0) {
    console.log("No critical supply choke points detected in the system currently.")
  } else {
    strainedAreas.slice(0, 10).forEach((entry, idx) => {
      console.log(`${idx + 1}. ${entry.city || 'Unknown Area'} - Status: ${entry.status.toUpperCase()} (${entry.count_entries} live tracking reports)`)
    })
  }

  console.log(`\n\n🟢 HEALTHY SUPPLY CHAINS`)
  console.log(`(Areas with the fastest turnaround times & optimal pressure)`)
  console.log(`---------------------------------------------------`)
  
  const healthyAreas = areas?.filter(a => a.status === 'full' || a.status === 'half') || []
  if (healthyAreas.length === 0) {
    console.log("Insufficient data on healthy supply routes.")
  } else {
    healthyAreas.slice(0, 10).forEach((entry, idx) => {
      console.log(`${idx + 1}. ${entry.city || 'Unknown Area'} - Status: ${entry.status.toUpperCase()} (${entry.count_entries} live tracking reports)`)
    })
  }

  console.log("\n=======================================")
  console.log("Data powered by CylinderCheck.in Community Tracking Engine")
  console.log("For Press & Journalism Use")
}

generatePRReport()
