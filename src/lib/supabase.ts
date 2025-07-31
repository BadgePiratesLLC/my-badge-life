import { createClient } from '@supabase/supabase-js'

// Debug: Check what environment variables are available
console.log('Available env vars:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  all_env: import.meta.env
})

// For Lovable projects with native Supabase integration
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'missing-url',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key'
)

// Database types
export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  role: 'user' | 'maker' | 'admin'
  wants_to_be_maker: boolean
  maker_approved: boolean
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  name: string
  maker_id: string | null
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