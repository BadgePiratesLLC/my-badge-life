// Database type definitions for Supabase tables
// This file contains TypeScript interfaces for the database schema

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
  retired: boolean
  created_at: string
  updated_at: string
  profiles?: Profile | null // For maker info
  badge_images?: BadgeImage[] | null // For multiple images
}

export interface BadgeImage {
  id: string
  badge_id: string
  image_url: string
  is_primary: boolean
  display_order: number
  caption?: string
  created_at: string
  updated_at: string
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
