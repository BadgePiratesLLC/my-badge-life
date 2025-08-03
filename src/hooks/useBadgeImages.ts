import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from '@/hooks/use-toast'

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

export function useBadgeImages(badgeId?: string) {
  const [images, setImages] = useState<BadgeImage[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (badgeId) {
      fetchBadgeImages()
    }
  }, [badgeId])

  const fetchBadgeImages = async () => {
    if (!badgeId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('badge_images')
        .select('*')
        .eq('badge_id', badgeId)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error fetching badge images:', error)
        toast({
          title: "Error",
          description: "Failed to load badge images.",
          variant: "destructive"
        })
      } else {
        setImages((data as BadgeImage[]) || [])
      }
    } catch (error) {
      console.error('Error fetching badge images:', error)
    } finally {
      setLoading(false)
    }
  }

  const addBadgeImage = async (file: File, caption?: string) => {
    if (!badgeId || !user) {
      throw new Error('Badge ID and user required')
    }

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${badgeId}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('badge-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('badge-images')
        .getPublicUrl(uploadData.path)

      // Add to badge_images table
      const { data, error } = await supabase
        .from('badge_images')
        .insert({
          badge_id: badgeId,
          image_url: publicUrl,
          caption,
          display_order: images.length
        })
        .select()
        .single()

      if (error) throw error

      setImages(prev => [...prev, data as BadgeImage])
      
      toast({
        title: "Success",
        description: "Image added to badge successfully.",
      })

      return data as BadgeImage
    } catch (error) {
      console.error('Error adding badge image:', error)
      toast({
        title: "Error",
        description: "Failed to add image to badge.",
        variant: "destructive"
      })
      throw error
    }
  }

  const removeBadgeImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('badge_images')
        .delete()
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => prev.filter(img => img.id !== imageId))
      
      toast({
        title: "Success",
        description: "Image removed from badge.",
      })
    } catch (error) {
      console.error('Error removing badge image:', error)
      toast({
        title: "Error",
        description: "Failed to remove image.",
        variant: "destructive"
      })
      throw error
    }
  }

  const setPrimaryImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('badge_images')
        .update({ is_primary: true })
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => prev.map(img => ({
        ...img,
        is_primary: img.id === imageId
      })))

      toast({
        title: "Success",
        description: "Primary image updated.",
      })
    } catch (error) {
      console.error('Error setting primary image:', error)
      toast({
        title: "Error",
        description: "Failed to set primary image.",
        variant: "destructive"
      })
      throw error
    }
  }

  const updateImageOrder = async (imageId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('badge_images')
        .update({ display_order: newOrder })
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, display_order: newOrder } : img
      ).sort((a, b) => a.display_order - b.display_order))
    } catch (error) {
      console.error('Error updating image order:', error)
      throw error
    }
  }

  const updateCaption = async (imageId: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('badge_images')
        .update({ caption })
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, caption } : img
      ))

      toast({
        title: "Success",
        description: "Caption updated.",
      })
    } catch (error) {
      console.error('Error updating caption:', error)
      toast({
        title: "Error",
        description: "Failed to update caption.",
        variant: "destructive"
      })
      throw error
    }
  }

  const primaryImage = images.find(img => img.is_primary)

  return {
    images,
    loading,
    primaryImage,
    addBadgeImage,
    removeBadgeImage,
    setPrimaryImage,
    updateImageOrder,
    updateCaption,
    refetch: fetchBadgeImages
  }
}