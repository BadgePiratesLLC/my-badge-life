import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface EmailPreferences {
  id?: string
  user_id: string
  badge_submission_notifications: boolean
  badge_approval_notifications: boolean
  badge_rejection_notifications: boolean
  weekly_digest_emails: boolean
  system_announcements: boolean
  created_at?: string
  updated_at?: string
}

export function useEmailPreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Default preferences for new users (opt-in system - all disabled by default)
  const defaultPreferences: Omit<EmailPreferences, 'id' | 'created_at' | 'updated_at'> = {
    user_id: user?.id || '',
    badge_submission_notifications: false,
    badge_approval_notifications: false,
    badge_rejection_notifications: false,
    weekly_digest_emails: false,
    system_announcements: false,
  }

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user])

  const fetchPreferences = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default ones
          await createDefaultPreferences()
        } else {
          throw error
        }
      } else {
        setPreferences(data)
      }
    } catch (error) {
      console.error('Error fetching email preferences:', error)
      toast.error('Failed to load email preferences')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultPreferences = async () => {
    if (!user) return

    try {
      const newPreferences = { ...defaultPreferences, user_id: user.id }
      
      const { data, error } = await supabase
        .from('email_preferences')
        .insert(newPreferences)
        .select()
        .single()

      if (error) throw error
      
      setPreferences(data)
    } catch (error) {
      console.error('Error creating default preferences:', error)
      // Set local defaults if database insert fails
      setPreferences({ ...defaultPreferences, user_id: user.id })
    }
  }

  const updatePreferences = async (updates: Partial<EmailPreferences>) => {
    if (!user || !preferences) return

    try {
      setSaving(true)
      
      const updatedPreferences = { ...preferences, ...updates }
      
      const { data, error } = await supabase
        .from('email_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      
      setPreferences(data)
      toast.success('Email preferences updated')
    } catch (error) {
      console.error('Error updating email preferences:', error)
      toast.error('Failed to update email preferences')
    } finally {
      setSaving(false)
    }
  }

  const togglePreference = async (key: keyof Omit<EmailPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!preferences) return
    
    const newValue = !preferences[key]
    await updatePreferences({ [key]: newValue })
  }

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    togglePreference,
    refetch: fetchPreferences
  }
}