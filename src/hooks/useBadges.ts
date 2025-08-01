import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Badge, Ownership } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [ownership, setOwnership] = useState<Ownership[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    // Always fetch badges immediately, regardless of auth state
    console.log('useBadges hook mounted, fetching badges...')
    fetchBadges()
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
    try {
      console.log('Starting fetchBadges function...')
      
      // Simple query first to test connection
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Supabase query completed')
      console.log('Error:', error)
      console.log('Data length:', data?.length)

      if (error) {
        console.error('Supabase error fetching badges:', error)
        setBadges([])
      } else {
        console.log('Badges fetched successfully:', data?.length || 0, 'badges')
        setBadges((data as unknown as Badge[]) || [])
      }
    } catch (error) {
      console.error('JavaScript error in fetchBadges:', error)
      setBadges([])
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
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

    setBadges(prev => [data as unknown as Badge, ...prev])
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
    refreshBadges: fetchBadges,
    refreshOwnership: fetchOwnership
  }
}