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
    fetchBadges()
    if (user) {
      fetchOwnership()
    }
  }, [user])

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select(`
          *,
          profiles:maker_id (
            id,
            display_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching badges:', error)
      } else {
        setBadges((data as unknown as Badge[]) || [])
      }
    } catch (error) {
      console.error('Error fetching badges:', error)
    } finally {
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