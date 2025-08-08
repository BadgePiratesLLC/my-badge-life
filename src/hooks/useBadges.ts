// Global badge cache to prevent multiple fetches
let badgesCache: any[] = []
let badgesCacheTime = 0
let isFetching = false

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Badge, Ownership } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from '@/hooks/use-toast'
import { useDiscordNotifications } from './useDiscordNotifications'

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>(badgesCache)
  const [ownership, setOwnership] = useState<Ownership[]>([])
  const [loading, setLoading] = useState(badgesCache.length === 0)
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const { notifyBadgeSubmitted } = useDiscordNotifications()

  useEffect(() => {
    // Only fetch badges if user is authenticated
    if (!user) {
      setLoading(false)
      return
    }

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
  }, [user])

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
        .select(`
          *,
          badge_images!left(
            id,
            image_url,
            is_primary,
            display_order,
            caption
          )
        `)
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
      
        // Fallback: Try to use a direct REST call with all images
        console.log('Trying fallback method...')
        try {
          const response = await fetch(`https://zdegwavcldwlgzzandae.supabase.co/rest/v1/badges?select=*,badge_images!left(id,image_url,is_primary,display_order,caption)&order=created_at.desc`, {
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

  // Note: toggleOwnership is now handled by useBadgeStats hook to prevent conflicts

  const createBadge = async (badgeData: {
    name: string
    year?: number
    description?: string
    external_link?: string
    image_url?: string
    team_name?: string
    category?: 'Elect Badge' | 'None Elect Badge' | 'SAO' | 'Tool' | 'Misc'
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

    // Send notifications for badge submission
    try {
      // Send Discord notification
      await notifyBadgeSubmitted({
        id: data.id,
        name: data.name,
        team_name: data.team_name,
        category: data.category,
        year: data.year,
        maker_name: profile?.display_name,
        image_url: data.image_url
      })

      // Send email notification to admins
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'badge_submitted',
          to: 'admin@mybadgelife.app', // This could be made configurable
          data: {
            badgeName: data.name,
            makerName: profile?.display_name || user.email,
            makerEmail: user.email,
            teamName: data.team_name,
            category: data.category,
            description: data.description,
            imageUrl: data.image_url,
            adminUrl: `${window.location.origin}/admin`,
            userId: user.id
          }
        }
      })
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError)
      // Don't throw error as badge was successfully created
      toast({
        title: "Badge Created",
        description: "Badge created successfully, but notifications may not have been sent.",
      })
    }
    
    return data
  }

  const uploadBadgeImage = async (file: File, sendNotification: boolean = true, badgeMetadata?: {
    name?: string;
    description?: string;
    year?: number;
    maker?: string;
    category?: string;
    external_link?: string;
    analysis?: any;
  }) => {
    try {
      console.log('uploadBadgeImage called with:', { 
        fileName: file.name, 
        fileSize: file.size, 
        sendNotification,
        userExists: !!user,
        userId: user?.id 
      });

      // Create unique filename - allow anonymous uploads for testing
      const fileExt = file.name.split('.').pop()
      const fileName = user 
        ? `${user.id}/${Date.now()}.${fileExt}`
        : `anonymous/${Date.now()}.${fileExt}`

      console.log('Generated filename:', fileName);

      // Upload to Supabase Storage
      console.log('Starting storage upload...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('badge-images')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      console.log('Storage upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('badge-images')
        .getPublicUrl(uploadData.path)

      console.log('Generated public URL:', publicUrl);

      // Record upload in database with metadata (allow anonymous uploads)
      console.log('Starting database insert...');
      const insertData = {
        user_id: user?.id || null,
        image_url: publicUrl,
        badge_name: badgeMetadata?.name || null,
        badge_description: badgeMetadata?.description || null,
        badge_year: badgeMetadata?.year || null,
        badge_maker: badgeMetadata?.maker || null,
        badge_category: badgeMetadata?.category || null,
        badge_external_link: badgeMetadata?.external_link || null,
        analysis_metadata: badgeMetadata?.analysis || null
      };

      console.log('Insert data:', insertData);

      const { data, error } = await supabase
        .from('uploads')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Database insert error:', error)
        throw new Error(`Database insert failed: ${error.message} (Code: ${error.code})`)
      }

      console.log('Database insert successful:', data);

      // Send Discord notification for new upload (only if requested)
      if (sendNotification) {
        try {
          const { data: notificationData, error: notificationError } = await supabase.functions.invoke('send-discord-notification', {
            body: {
              type: 'badge_submitted',
              data: {
                title: '📷 New Badge Image Uploaded',
                description: user 
                  ? `**${user.email}** uploaded a new badge image for identification.`
                  : 'An anonymous user uploaded a new badge image for identification.',
                fields: [
                  {
                    name: 'Upload ID',
                    value: data.id,
                    inline: true
                  },
                  {
                    name: 'Status',
                    value: 'Awaiting admin processing',
                    inline: true
                  }
                ],
                thumbnail: {
                  url: publicUrl
                }
              }
            }
          });

          if (notificationError) {
            console.error('Discord notification error:', notificationError);
          }
        } catch (error) {
          console.error('Failed to send Discord notification:', error);
          // Don't throw here - upload was successful, notification failure shouldn't break the flow
        }
      }

      return { url: publicUrl, upload: data }
    } catch (error) {
      console.error('uploadBadgeImage failed:', error);
      throw error;
    }
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