import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

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
  const { user } = useAuth()

  const fetchBadgeStats = async () => {
    try {
      // Get ownership counts
      const { data: ownersData, error: ownersError } = await supabase
        .from('ownership')
        .select('id')
        .eq('badge_id', badgeId)
        .eq('status', 'own')

      if (ownersError) throw ownersError

      // Get wants counts  
      const { data: wantsData, error: wantsError } = await supabase
        .from('ownership')
        .select('id')
        .eq('badge_id', badgeId)
        .eq('status', 'want')

      if (wantsError) throw wantsError

      // Get ranking by counting badges with more owners
      const ownersCount = ownersData?.length || 0
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
        wantsCount: wantsData?.length || 0,
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
    if (!user) return

    try {
      const status = type === 'own' ? 'own' : 'want'
      const currentStatus = type === 'own' ? userOwnership.isOwned : userOwnership.isWanted

      if (currentStatus) {
        // Remove ownership/want
        await supabase
          .from('ownership')
          .delete()
          .eq('badge_id', badgeId)
          .eq('user_id', user.id)
          .eq('status', status)
      } else {
        // Add ownership/want
        await supabase
          .from('ownership')
          .insert({
            badge_id: badgeId,
            user_id: user.id,
            status
          })
      }

      // Update local state immediately for better UX
      setUserOwnership(prev => ({
        ...prev,
        [type === 'own' ? 'isOwned' : 'isWanted']: !currentStatus
      }))

      // Update stats
      setStats(prev => ({
        ...prev,
        [type === 'own' ? 'ownersCount' : 'wantsCount']: currentStatus 
          ? prev[type === 'own' ? 'ownersCount' : 'wantsCount'] - 1
          : prev[type === 'own' ? 'ownersCount' : 'wantsCount'] + 1
      }))

      // Refresh to get accurate ranking
      setTimeout(fetchBadgeStats, 500)
    } catch (error) {
      console.error('Error toggling ownership:', error)
      // Revert optimistic update on error
      fetchBadgeStats()
    }
  }

  useEffect(() => {
    if (badgeId) {
      fetchBadgeStats()
    }
  }, [badgeId, user])

  // Listen for ownership changes from other components
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