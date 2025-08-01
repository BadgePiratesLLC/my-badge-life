// Global badge cache to prevent multiple fetches
let badgesCache: any[] = []
let badgesCacheTime = 0
let isFetching = false

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Badge, Ownership } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>(badgesCache)
  const [ownership, setOwnership] = useState<Ownership[]>([])
  const [loading, setLoading] = useState(badgesCache.length === 0)
  const { user } = useAuth()

  useEffect(() => {
    // Check if we need to fetch badges (no cache or cache is old)
    const now = Date.now()
    const cacheExpiry = 5 * 60 * 1000 // 5 minutes
    
    if (badgesCache.length === 0 || (now - badgesCacheTime) > cacheExpiry) {
      if (!isFetching) {
        console.log('Fetching badges (cache miss or expired)...')
        fetchBadges()
      }
    } else {
      console.log('Using cached badges:', badgesCache.length)
      setBadges(badgesCache)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch ownership if user is logged in
    if (user) {
      console.log('User logged in, fetching ownership...')
      fetchOwnership()
    } else {
      console.log('No user, clearing ownership...')
      setOwnership([]) // Clear ownership when not logged in
    }
  }, [user])

  const fetchBadges = async () => {
    if (isFetching) {
      console.log('Already fetching badges, skipping...')
      return
    }
    
    isFetching = true
    
    try {
      console.log('Starting fetchBadges function...')
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 10000)
      )
      
      const queryPromise = supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('About to execute query with timeout...')
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      console.log('Query completed!')
      console.log('Error:', error)
      console.log('Data:', data)

      if (error) {
        console.error('Supabase error fetching badges:', error)
        setBadges([])
        badgesCache = []
      } else {
        console.log('Badges fetched successfully:', data?.length || 0, 'badges')
        const badgeData = (data as unknown as Badge[]) || []
        setBadges(badgeData)
        badgesCache = badgeData
        badgesCacheTime = Date.now()
      }
    } catch (error) {
      console.error('Error in fetchBadges:', error)
      
      // Fallback: Try to use a direct REST call
      console.log('Trying fallback method...')
      try {
        const response = await fetch(`https://zdegwavcldwlgzzandae.supabase.co/rest/v1/badges?select=*&order=created_at.desc`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWd3YXZjbGR3bGd6emFuZGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDQ4MTQsImV4cCI6MjA2OTU4MDgxNH0.ariBt1m5qjyP7EFe-KnFOcqoA8Ih3ihiuWkevdP0Kvs',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWd3YXZjbGR3bGd6emFuZGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDQ4MTQsImV4cCI6MjA2OTU4MDgxNH0.ariBt1m5qjyP7EFe-KnFOcqoA8Ih3ihiuWkevdP0Kvs'
          }
        })
        
        if (response.ok) {
          const fallbackData = await response.json()
          console.log('Fallback fetch successful:', fallbackData?.length || 0, 'badges')
          setBadges(fallbackData || [])
          badgesCache = fallbackData || []
          badgesCacheTime = Date.now()
        } else {
          console.error('Fallback fetch failed:', response.status, response.statusText)
          setBadges([])
          badgesCache = []
        }
      } catch (fallbackError) {
        console.error('Fallback fetch error:', fallbackError)
        setBadges([])
        badgesCache = []
      }
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
      isFetching = false
    }
  }

  const fetchOwnership = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('ownership')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching ownership:', error)
      } else {
        setOwnership((data as unknown as Ownership[]) || [])
      }
    } catch (error) {
      console.error('Error fetching ownership:', error)
    }
  }

  const toggleOwnership = async (badgeId: string, status: 'own' | 'want') => {
    if (!user) throw new Error('Must be logged in')

    // Check if ownership already exists
    const existingOwnership = ownership.find(
      o => o.badge_id === badgeId && o.status === status
    )

    if (existingOwnership) {
      // Remove ownership
      const { error } = await supabase
        .from('ownership')
        .delete()
        .eq('id', existingOwnership.id)

      if (error) {
        console.error('Error removing ownership:', error)
        throw error
      }

      setOwnership(prev => prev.filter(o => o.id !== existingOwnership.id))
    } else {
      // Add ownership
      const { data, error } = await supabase
        .from('ownership')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          status
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding ownership:', error)
        throw error
      }

      setOwnership(prev => [...prev, data as unknown as Ownership])
    }
  }

  const createBadge = async (badgeData: {
    name: string
    year?: number
    description?: string
    external_link?: string
    image_url?: string
  }) => {
    if (!user) throw new Error('Must be logged in')

    const { data, error } = await supabase
      .from('badges')
      .insert({
        ...badgeData,
        maker_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating badge:', error)
      throw error
    }

    // Update local state and cache
    const newBadge = data as unknown as Badge
    setBadges(prev => [newBadge, ...prev])
    badgesCache = [newBadge, ...badgesCache]
    return data
  }

  const uploadBadgeImage = async (file: File) => {
    // Create unique filename - allow anonymous uploads for testing
    const fileExt = file.name.split('.').pop()
    const fileName = user 
      ? `${user.id}/${Date.now()}.${fileExt}`
      : `anonymous/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('badge-images')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('badge-images')
      .getPublicUrl(uploadData.path)

    // Record upload in database (allow anonymous uploads)
    const { data, error } = await supabase
      .from('uploads')
      .insert({
        user_id: user?.id || null,
        image_url: publicUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording upload:', error)
      throw error
    }

    return { url: publicUrl, upload: data }
  }

  // Helper functions for ownership status
  const isOwned = (badgeId: string) => 
    ownership.some(o => o.badge_id === badgeId && o.status === 'own')
  
  const isWanted = (badgeId: string) => 
    ownership.some(o => o.badge_id === badgeId && o.status === 'want')

  const getOwnershipStats = () => ({
    owned: ownership.filter(o => o.status === 'own').length,
    wanted: ownership.filter(o => o.status === 'want').length,
    total: badges.length
  })

  return {
    badges,
    ownership,
    loading,
    toggleOwnership,
    createBadge,
    uploadBadgeImage,
    isOwned,
    isWanted,
    getOwnershipStats,
    refreshBadges: () => {
      badgesCache = []
      badgesCacheTime = 0
      fetchBadges()
    },
    refreshOwnership: fetchOwnership
  }
}