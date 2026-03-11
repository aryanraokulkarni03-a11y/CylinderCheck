import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase env vars missing! Check .env.local in project root.')
}

export const supabase = createClient(
  supabaseUrl || 'sb_publishable_5TepiBRbfKL4_3oYQxSMEQ_od43t9yO',
  supabaseAnonKey || 'placeholder-key'
)

export const hasSupabase = !!(supabaseUrl && supabaseAnonKey)
