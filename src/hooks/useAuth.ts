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
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('Starting auth initialization...')
        
        // First get the current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
        }
        
        if (!isMounted) return;
        
        console.log('Session data:', session?.user?.email || 'no session found')
        
        if (session?.user) {
          setUser(session.user)
          console.log('User found, fetching profile...')
          await fetchProfile(session.user.id)
        } else {
          console.log('No session found, checking localStorage...')
          
          // Check all localStorage keys for Supabase auth
          const keys = Object.keys(localStorage);
          const authKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'));
          console.log('Auth-related localStorage keys:', authKeys);
          
          // Also check the specific Supabase auth key pattern
          const sbAuthKey = 'sb-zdegwavcldwlgzzandae-auth-token';
          const sbAuthValue = localStorage.getItem(sbAuthKey);
          console.log('Supabase auth key check:', sbAuthKey, 'exists:', !!sbAuthValue);
          
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error during auth initialization:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change:', event, session?.user?.email || 'no user')
      
      if (session?.user) {
        setUser(session.user)
        // Fetch profile for new sessions or user changes
        if (event === 'SIGNED_IN' || !profile || profile.id !== session.user.id) {
          await fetchProfile(session.user.id)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      
      if (initialized) {
        setLoading(false)
      }
    })

    // Initialize
    initializeAuth()

    return () => {
      isMounted = false;
      subscription.unsubscribe()
    }
  }, []) // Remove dependencies to prevent re-initialization

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

  const signInWithGoogle = async (keepLoggedIn: boolean = true) => {
    try {
      console.log('Starting Google sign-in...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      
      if (error) {
        console.error('Error signing in with Google:', error)
        throw error
      }
      
      console.log('Google sign-in initiated successfully')
      
      // Always store the preference to keep logged in for this app
      localStorage.setItem('keepLoggedIn', 'true')
      
      return data
    } catch (error) {
      console.error('Sign-in error:', error)
      throw error
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
