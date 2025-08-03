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
    console.log(`[useBadgeStats] toggleOwnership called for badge ${badgeId}, type: ${type}, user: ${user?.id}`);
    
    if (!user) {
      console.error('[useBadgeStats] No user found for ownership toggle');
      throw new Error('User not authenticated');
    }

    try {
      const status = type === 'own' ? 'own' : 'want'
      
      // Always check current database state before making changes
      console.log(`[useBadgeStats] Checking current database state for badge ${badgeId}, user ${user.id}, status ${status}`);
      const { data: existingData, error: checkError } = await supabase
        .from('ownership')
        .select('id')
        .eq('badge_id', badgeId)
        .eq('user_id', user.id)
        .eq('status', status)
        .maybeSingle()

      if (checkError) {
        console.error('[useBadgeStats] Error checking existing ownership:', checkError);
        throw checkError;
      }

      const hasExisting = !!existingData
      console.log(`[useBadgeStats] Database check: ${hasExisting ? 'has existing' : 'no existing'} ownership`);

      if (hasExisting) {
        // Remove ownership/want
        console.log(`[useBadgeStats] Removing ownership: badge_id=${badgeId}, user_id=${user.id}, status=${status}`);
        const { error } = await supabase
          .from('ownership')
          .delete()
          .eq('badge_id', badgeId)
          .eq('user_id', user.id)
          .eq('status', status)

        if (error) {
          console.error('[useBadgeStats] Delete error:', error);
          throw error;
        }
        console.log('[useBadgeStats] Delete successful');
      } else {
        // Add ownership/want - use upsert to handle potential race conditions
        console.log(`[useBadgeStats] Adding ownership: badge_id=${badgeId}, user_id=${user.id}, status=${status}`);
        const { error } = await supabase
          .from('ownership')
          .upsert({
            badge_id: badgeId,
            user_id: user.id,
            status
          }, {
            onConflict: 'user_id,badge_id,status'
          })

        if (error) {
          console.error('[useBadgeStats] Upsert error:', error);
          throw error;
        }
        console.log('[useBadgeStats] Upsert successful');
      }

      // Update local user ownership state immediately for better UX
      console.log('[useBadgeStats] Updating local user state...');
      setUserOwnership(prev => ({
        ...prev,
        [type === 'own' ? 'isOwned' : 'isWanted']: !hasExisting
      }))

      console.log('[useBadgeStats] Local state updated, dispatching ownership-changed event...');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('ownership-changed', {
        detail: { badgeId, type, user_id: user.id, added: !hasExisting }
      }))

      // Refresh to get accurate counts from database immediately
      fetchBadgeStats()
    } catch (error) {
      console.error('[useBadgeStats] Error toggling ownership:', error)
      console.error('[useBadgeStats] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      // Revert optimistic update on error by refreshing from database
      fetchBadgeStats()
      // Re-throw the error so the UI can handle it
      throw error;
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