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
    console.log(`[useBadgeStats] fetchBadgeStats called for badge ${badgeId}`);
    try {
      // Use the database function to get accurate public counts (bypasses RLS)
      console.log(`[useBadgeStats] Fetching public stats using get_badge_stats function for badge ${badgeId}`);
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_badge_stats', { badge_uuid: badgeId })
        .single()

      if (statsError) {
        console.error('[useBadgeStats] Error fetching public stats:', statsError);
        throw statsError;
      }

      console.log(`[useBadgeStats] Public stats data:`, statsData);

      // Get ranking by counting badges with more owners
      const ownersCount = Number(statsData?.owners_count || 0)
      const wantsCount = Number(statsData?.wants_count || 0)
      console.log(`[useBadgeStats] Calculated counts - owners: ${ownersCount}, wants: ${wantsCount}`);
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

      console.log(`[useBadgeStats] Stats updated for badge ${badgeId}:`, {
        ownersCount,
        wantsCount,
        ownershipRank
      });

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

  // Listen for real-time ownership changes
  useEffect(() => {
    if (!badgeId) return

    console.log('[useBadgeStats] Setting up real-time subscription for badge:', badgeId)
    
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
        (payload) => {
          console.log('[useBadgeStats] Real-time ownership change detected:', payload)
          // Refresh stats when any ownership changes for this badge
          fetchBadgeStats()
        }
      )
      .subscribe((status) => {
        console.log('[useBadgeStats] Real-time subscription status:', status)
      })

    return () => {
      console.log('[useBadgeStats] Cleaning up real-time subscription for badge:', badgeId)
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