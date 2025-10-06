import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'

export interface BadgeStats {
  ownersCount: number
  wantsCount: number
  ownershipRank: number | null
}

interface UserOwnership {
  isOwned: boolean
  isWanted: boolean
}

export function useBadgeStats(badgeId: string) {
  const [stats, setStats] = useState<BadgeStats>({
    ownersCount: 0,
    wantsCount: 0,
    ownershipRank: null
  })
  const [userOwnership, setUserOwnership] = useState<UserOwnership>({
    isOwned: false,
    isWanted: false
  })
  const [loading, setLoading] = useState(true)
  const { user } = useAuthContext()

  const fetchBadgeStats = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_badge_stats', { badge_uuid: badgeId })
        .single()

      if (statsError) {
        console.error('Error fetching public stats:', statsError);
        throw statsError;
      }

      const ownersCount = Number(statsData?.owners_count || 0)
      const wantsCount = Number(statsData?.wants_count || 0)
      let ownershipRank = null

      if (ownersCount > 0) {
        const { data: rankData, error: rankError } = await supabase
          .from('ownership')
          .select('badge_id')
          .eq('status', 'own')

        if (!rankError && rankData) {
          // Count owners per badge
          const badgeOwnerCounts = rankData.reduce((acc, item) => {
            acc[item.badge_id] = (acc[item.badge_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          // Calculate rank (how many badges have more owners)
          const morePopularBadges = Object.values(badgeOwnerCounts).filter(
            count => count > ownersCount
          ).length

          ownershipRank = morePopularBadges + 1
        }
      }

      setStats({
        ownersCount,
        wantsCount,
        ownershipRank
      })

      // Get user's ownership status if authenticated
      if (user) {
        const { data: userOwnershipData, error: userError } = await supabase
          .from('ownership')
          .select('status')
          .eq('badge_id', badgeId)
          .eq('user_id', user.id)

        if (!userError && userOwnershipData) {
          const ownedRecord = userOwnershipData.find(record => record.status === 'own')
          const wantedRecord = userOwnershipData.find(record => record.status === 'want')
          
          setUserOwnership({
            isOwned: !!ownedRecord,
            isWanted: !!wantedRecord
          })
        }
      }
    } catch (error) {
      console.error('Error fetching badge stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleOwnership = async (type: 'own' | 'want') => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const status = type === 'own' ? 'own' : 'want'
      
      const { data: existingData, error: checkError } = await supabase
        .from('ownership')
        .select('id')
        .eq('badge_id', badgeId)
        .eq('user_id', user.id)
        .eq('status', status)
        .maybeSingle()

      if (checkError) throw checkError

      const hasExisting = !!existingData

      if (hasExisting) {
        const { error } = await supabase
          .from('ownership')
          .delete()
          .eq('badge_id', badgeId)
          .eq('user_id', user.id)
          .eq('status', status)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ownership')
          .upsert({
            badge_id: badgeId,
            user_id: user.id,
            status
          }, {
            onConflict: 'user_id,badge_id,status'
          })

        if (error) throw error
      }

      setUserOwnership(prev => ({
        ...prev,
        [type === 'own' ? 'isOwned' : 'isWanted']: !hasExisting
      }))
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('ownership-changed', {
        detail: { badgeId, type, user_id: user.id, added: !hasExisting }
      }))

      fetchBadgeStats()
    } catch (error) {
      console.error('Error toggling ownership:', error)
      fetchBadgeStats()
      throw error;
    }
  }

  useEffect(() => {
    if (badgeId) {
      fetchBadgeStats()
    }
  }, [badgeId, user])

  // Listen for real-time ownership changes
  useEffect(() => {
    if (!badgeId) return
    
    const channel = supabase
      .channel(`badge-ownership-${badgeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ownership',
          filter: `badge_id=eq.${badgeId}`
        },
        () => fetchBadgeStats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [badgeId])

  // Listen for ownership changes from other components (fallback)
  useEffect(() => {
    const handleOwnershipChange = (event: CustomEvent) => {
      if (event.detail.badgeId === badgeId) {
        fetchBadgeStats()
      }
    }

    window.addEventListener('ownership-changed', handleOwnershipChange as EventListener)
    return () => {
      window.removeEventListener('ownership-changed', handleOwnershipChange as EventListener)
    }
  }, [badgeId])

  return {
    stats,
    userOwnership,
    loading,
    toggleOwnership,
    refreshStats: fetchBadgeStats
  }
}