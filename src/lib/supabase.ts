import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: Check what environment variables are available
console.log('Supabase environment check:', {
  url: supabaseUrl,
  key: supabaseAnonKey ? 'provided' : 'missing',
  all_env_keys: Object.keys(import.meta.env)
})

// Validate environment variables and create client
let supabase: ReturnType<typeof createClient>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure your Supabase project is properly connected in Lovable.')
  // Create a dummy client to prevent crashes
  supabase = createClient('https://dummy.supabase.co', 'dummy-key')
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }

// Database types
export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  role: 'user' | 'maker' | 'admin'
  wants_to_be_maker: boolean
  maker_approved: boolean
  assigned_team: string | null
  created_at: string
  updated_at: string
}

export type BadgeCategory = 'Elect Badge' | 'None Elect Badge' | 'SAO' | 'Tool' | 'Misc'

export interface Badge {
  id: string
  name: string
  maker_id: string | null
  team_name: string | null
  category: BadgeCategory | null
  year: number | null
  image_url: string | null
  description: string | null
  external_link: string | null
  created_at: string
  updated_at: string
  profiles?: Profile | null // For maker info
}

export interface Ownership {
  id: string
  user_id: string
  badge_id: string
  status: 'own' | 'want'
  created_at: string
}

export interface Upload {
  id: string
  user_id: string | null
  image_url: string
  badge_guess_id: string | null
  created_at: string
}