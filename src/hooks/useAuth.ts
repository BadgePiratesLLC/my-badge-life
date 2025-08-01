import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useDiscordNotifications } from './useDiscordNotifications'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { notifyMakerRequest } = useDiscordNotifications()

  useEffect(() => {
    // Set a maximum loading time to prevent infinite loading
    const maxLoadTime = setTimeout(() => {
      console.log('Auth initialization timeout - setting loading to false')
      setLoading(false)
    }, 3000) // 3 seconds max

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          clearTimeout(maxLoadTime)
          return
        }

        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
          clearTimeout(maxLoadTime)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setLoading(false)
        clearTimeout(maxLoadTime)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
        clearTimeout(maxLoadTime)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(maxLoadTime)
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data as unknown as Profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    
    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }

    setProfile(data as unknown as Profile)
    return data as unknown as Profile
  }

  const requestMakerStatus = async () => {
    const result = await updateProfile({ wants_to_be_maker: true })
    
    // Send Discord notification for maker request
    try {
      await notifyMakerRequest({
        display_name: profile?.display_name,
        email: profile?.email,
      });
    } catch (error) {
      console.error('Failed to send maker request notification:', error);
    }
    
    return result
  }

  return {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    updateProfile,
    requestMakerStatus,
    isAuthenticated: !!user,
    isMaker: profile?.role === 'maker' && profile?.maker_approved,
    isAdmin: profile?.role === 'admin',
    isBadgeMaker: profile?.role === 'maker' && profile?.maker_approved, // alias for consistency
  }
}