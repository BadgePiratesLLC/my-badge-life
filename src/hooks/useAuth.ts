import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useDiscordNotifications } from './useDiscordNotifications'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const { notifyMakerRequest } = useDiscordNotifications()

  useEffect(() => {
    let isMounted = true;
    
    // Set a maximum loading time to prevent infinite loading
    const maxLoadTime = setTimeout(() => {
      if (isMounted) {
        console.log('Auth initialization timeout - setting loading to false')
        setLoading(false)
        setInitialized(true)
      }
    }, 5000) // 5 seconds max

    // Listen for auth changes FIRST to catch all events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change:', event, session?.user?.id || 'no user')
      
      // Update user state immediately
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Only fetch profile if we haven't initialized or user changed
        if (!initialized || user?.id !== session.user.id) {
          // Use setTimeout to prevent deadlock with onAuthStateChange
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(session.user.id)
            }
          }, 0)
        }
        setLoading(false)
        clearTimeout(maxLoadTime)
      } else {
        setProfile(null)
        setLoading(false)
        clearTimeout(maxLoadTime)
      }
      
      if (!initialized) {
        setInitialized(true)
      }
    })

    // THEN get initial session (this may trigger the listener above)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error('Error getting initial session:', error)
        setLoading(false)
        clearTimeout(maxLoadTime)
        setInitialized(true)
      }
      // Session will be handled by the listener above
    })

    return () => {
      isMounted = false;
      subscription.unsubscribe()
      clearTimeout(maxLoadTime)
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
      } else if (data) {
        console.log('Profile fetched successfully:', data)
        setProfile(data as unknown as Profile)
      } else {
        console.log('No profile found for user:', userId)
        setProfile(null)
      }
    } catch (error) {
      console.error('Exception fetching profile:', error)
      setProfile(null)
    }
  }

  const signInWithGoogle = async (keepLoggedIn: boolean = false) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        ...(keepLoggedIn && {
          // Set session to persist for 5 days (432000 seconds)
          persistSession: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        })
      }
    })
    
    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
    
    // If keep logged in is selected, store the preference
    if (keepLoggedIn) {
      localStorage.setItem('keepLoggedIn', 'true')
    } else {
      localStorage.removeItem('keepLoggedIn')
    }
  }

  const signOut = async () => {
    // Clear the keep logged in preference
    localStorage.removeItem('keepLoggedIn')
    
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
    
    // Send notifications for maker request
    try {
      // Send Discord notification
      await notifyMakerRequest({
        display_name: profile?.display_name,
        email: profile?.email,
      });

      // Send email notification to admins
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'maker_request',
          to: 'admin@mybadgelife.app', // This should be configurable
          data: {
            userName: profile?.display_name || user?.email,
            userEmail: user?.email,
            requestMessage: `User ${profile?.display_name || user?.email} has requested maker status.`,
            userProfileUrl: `${window.location.origin}/admin#users`,
            adminUrl: `${window.location.origin}/admin`,
            registrationDate: profile?.created_at,
            userId: user?.id
          }
        }
      })
    } catch (error) {
      console.error('Failed to send notifications:', error);
      // Don't throw error as request was successfully submitted
    }
    
    return result
  }

  return {
    user,
    profile,
    loading,
    initialized,
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